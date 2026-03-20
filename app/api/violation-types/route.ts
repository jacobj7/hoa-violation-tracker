import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  base_fine: z.number().min(0),
  community_id: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("community_id");

    if (!communityId) {
      return NextResponse.json(
        { error: "community_id query parameter is required" },
        { status: 400 },
      );
    }

    const parsedCommunityId = parseInt(communityId, 10);
    if (isNaN(parsedCommunityId)) {
      return NextResponse.json(
        { error: "community_id must be a valid integer" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, name, description, base_fine, community_id, created_at, updated_at
         FROM violation_types
         WHERE community_id = $1
         ORDER BY name ASC`,
        [parsedCommunityId],
      );

      return NextResponse.json(
        { violation_types: result.rows },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation types:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createViolationTypeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, base_fine, community_id } = parseResult.data;

    const client = await pool.connect();
    try {
      const communityCheck = await client.query(
        "SELECT id FROM communities WHERE id = $1",
        [community_id],
      );

      if (communityCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Community not found" },
          { status: 404 },
        );
      }

      const result = await client.query(
        `INSERT INTO violation_types (name, description, base_fine, community_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, description, base_fine, community_id, created_at, updated_at`,
        [name, description ?? null, base_fine, community_id],
      );

      return NextResponse.json(
        { violation_type: result.rows[0] },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating violation type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
