import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  owner_id: z.string().uuid("Invalid owner ID"),
  community_id: z.string().uuid("Invalid community ID"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const community_id = searchParams.get("community_id");

    let query: string;
    let params: string[];

    if (community_id) {
      const parsed = z.string().uuid().safeParse(community_id);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid community_id format" },
          { status: 400 },
        );
      }
      query = `
        SELECT 
          p.id,
          p.address,
          p.owner_id,
          p.community_id,
          p.created_at,
          p.updated_at
        FROM properties p
        WHERE p.community_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [community_id];
    } else {
      query = `
        SELECT 
          p.id,
          p.address,
          p.owner_id,
          p.community_id,
          p.created_at,
          p.updated_at
        FROM properties p
        ORDER BY p.created_at DESC
      `;
      params = [];
    }

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { address, owner_id, community_id } = parsed.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO properties (address, owner_id, community_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, address, owner_id, community_id, created_at, updated_at
        `,
        [address, owner_id, community_id],
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
