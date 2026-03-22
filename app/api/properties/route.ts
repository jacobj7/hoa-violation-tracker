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
  unit: z.string().optional().nullable(),
  community_id: z.number().int().positive().optional().nullable(),
  owner_id: z.number().int().positive().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("community_id");

    let query: string;
    let params: (string | number)[];

    if (communityId) {
      const parsedCommunityId = parseInt(communityId, 10);
      if (isNaN(parsedCommunityId)) {
        return NextResponse.json(
          { error: "Invalid community_id parameter" },
          { status: 400 },
        );
      }

      query = `
        SELECT
          p.id,
          p.address,
          p.unit,
          p.community_id,
          p.owner_id,
          p.created_at,
          p.updated_at,
          u.id AS owner_user_id,
          u.name AS owner_name,
          u.email AS owner_email
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.community_id = $1
        ORDER BY p.address ASC, p.unit ASC
      `;
      params = [parsedCommunityId];
    } else {
      query = `
        SELECT
          p.id,
          p.address,
          p.unit,
          p.community_id,
          p.owner_id,
          p.created_at,
          p.updated_at,
          u.id AS owner_user_id,
          u.name AS owner_name,
          u.email AS owner_email
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.address ASC, p.unit ASC
      `;
      params = [];
    }

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      const properties = result.rows.map((row) => ({
        id: row.id,
        address: row.address,
        unit: row.unit,
        community_id: row.community_id,
        owner_id: row.owner_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner: row.owner_user_id
          ? {
              id: row.owner_user_id,
              name: row.owner_name,
              email: row.owner_email,
            }
          : null,
      }));

      return NextResponse.json({ properties }, { status: 200 });
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
        { status: 400 },
      );
    }

    const { address, unit, community_id, owner_id } = parseResult.data;

    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO properties (address, unit, community_id, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING
          id,
          address,
          unit,
          community_id,
          owner_id,
          created_at,
          updated_at
      `;
      const insertParams = [
        address,
        unit ?? null,
        community_id ?? null,
        owner_id ?? null,
      ];

      const insertResult = await client.query(insertQuery, insertParams);
      const newProperty = insertResult.rows[0];

      let owner = null;
      if (newProperty.owner_id) {
        const ownerResult = await client.query(
          "SELECT id, name, email FROM users WHERE id = $1",
          [newProperty.owner_id],
        );
        if (ownerResult.rows.length > 0) {
          owner = {
            id: ownerResult.rows[0].id,
            name: ownerResult.rows[0].name,
            email: ownerResult.rows[0].email,
          };
        }
      }

      return NextResponse.json(
        {
          property: {
            ...newProperty,
            owner,
          },
        },
        { status: 201 },
      );
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
