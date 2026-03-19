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
  owner_name: z.string().optional(),
  owner_email: z.string().email().optional().or(z.literal("")),
  owner_phone: z.string().optional(),
  property_type: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
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
          p.owner_name,
          p.owner_email,
          p.owner_phone,
          p.property_type,
          p.description,
          p.created_at,
          p.updated_at,
          COUNT(v.id) FILTER (WHERE v.status = 'open') AS open_violation_count
        FROM properties p
        LEFT JOIN violations v ON v.property_id = p.id
        GROUP BY
          p.id,
          p.address,
          p.city,
          p.state,
          p.zip_code,
          p.owner_name,
          p.owner_email,
          p.owner_phone,
          p.property_type,
          p.description,
          p.created_at,
          p.updated_at
        ORDER BY p.created_at DESC
      `);

      return NextResponse.json({ properties: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
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
        { status: 422 },
      );
    }

    const {
      address,
      city,
      state,
      zip_code,
      owner_name,
      owner_email,
      owner_phone,
      property_type,
      description,
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
          owner_name,
          owner_email,
          owner_phone,
          property_type,
          description,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          NOW(), NOW()
        )
        RETURNING *
        `,
        [
          address,
          city,
          state,
          zip_code,
          owner_name ?? null,
          owner_email || null,
          owner_phone ?? null,
          property_type ?? null,
          description ?? null,
        ],
      );

      return NextResponse.json({ property: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
