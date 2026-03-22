import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "Zip code is required"),
  property_type: z.string().optional(),
  owner_name: z.string().optional(),
  owner_email: z.string().email().optional().or(z.literal("")),
  owner_phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        p.id,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        p.property_type,
        p.owner_name,
        p.owner_email,
        p.owner_phone,
        p.notes,
        p.created_at,
        p.updated_at,
        COUNT(v.id)::int AS violation_count,
        COUNT(CASE WHEN v.status = 'open' THEN 1 END)::int AS open_violation_count,
        COUNT(CASE WHEN v.status = 'resolved' THEN 1 END)::int AS resolved_violation_count
      FROM properties p
      LEFT JOIN violations v ON v.property_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({ properties: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createPropertySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const {
    address,
    city,
    state,
    zip_code,
    property_type,
    owner_name,
    owner_email,
    owner_phone,
    notes,
  } = parseResult.data;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO properties (
        address,
        city,
        state,
        zip_code,
        property_type,
        owner_name,
        owner_email,
        owner_phone,
        notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
      `,
      [
        address,
        city,
        state,
        zip_code,
        property_type ?? null,
        owner_name ?? null,
        owner_email || null,
        owner_phone ?? null,
        notes ?? null,
      ],
    );

    return NextResponse.json({ property: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
