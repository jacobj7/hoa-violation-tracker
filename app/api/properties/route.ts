import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  unit: z.string().optional(),
  community_id: z
    .number()
    .int()
    .positive("community_id must be a positive integer"),
  owner_id: z.number().int().positive("owner_id must be a positive integer"),
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM properties ORDER BY created_at DESC",
      );
      return NextResponse.json({ properties: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { address, unit, community_id, owner_id } = parseResult.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO properties (address, unit, community_id, owner_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [address, unit ?? null, community_id, owner_id],
      );
      return NextResponse.json({ property: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 },
    );
  }
}
