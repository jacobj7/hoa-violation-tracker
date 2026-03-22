import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  default_fine_amount: z.number().nonnegative().optional(),
  community_id: z.number().int().positive(),
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
    let params: unknown[];

    if (communityId) {
      const parsedId = parseInt(communityId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { error: "Invalid community_id" },
          { status: 400 },
        );
      }
      query = `
        SELECT id, name, description, default_fine_amount, community_id, created_at, updated_at
        FROM violation_categories
        WHERE community_id = $1
        ORDER BY name ASC
      `;
      params = [parsedId];
    } else {
      query = `
        SELECT id, name, description, default_fine_amount, community_id, created_at, updated_at
        FROM violation_categories
        ORDER BY name ASC
      `;
      params = [];
    }

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return NextResponse.json({ categories: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/violation-categories error:", error);
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

    const parseResult = createCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, default_fine_amount, community_id } =
      parseResult.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO violation_categories (name, description, default_fine_amount, community_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, name, description, default_fine_amount, community_id, created_at, updated_at
        `,
        [name, description ?? null, default_fine_amount ?? null, community_id],
      );

      return NextResponse.json({ category: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/violation-categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
