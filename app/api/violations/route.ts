import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const violationPostSchema = z.object({
  property_id: z.number().int().positive(),
  violation_type_id: z.number().int().positive(),
  description: z.string().min(1).max(5000),
  reported_by: z.string().min(1).max(255),
});

const violationGetSchema = z.object({
  status: z.string().optional(),
  property_id: z.string().optional(),
  community_id: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      status: searchParams.get("status") ?? undefined,
      property_id: searchParams.get("property_id") ?? undefined,
      community_id: searchParams.get("community_id") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = violationGetSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, property_id, community_id, page, limit } = parsed.data;

    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10)))
      : 20;
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      values.push(status);
    }

    if (property_id) {
      const pid = parseInt(property_id, 10);
      if (!isNaN(pid)) {
        conditions.push(`v.property_id = $${paramIndex++}`);
        values.push(pid);
      }
    }

    if (community_id) {
      const cid = parseInt(community_id, 10);
      if (!isNaN(cid)) {
        conditions.push(`p.community_id = $${paramIndex++}`);
        values.push(cid);
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      LEFT JOIN properties p ON v.property_id = p.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.property_id,
        v.violation_type_id,
        v.description,
        v.reported_by,
        v.status,
        v.created_at,
        v.updated_at,
        p.address AS property_address,
        p.community_id,
        vt.name AS violation_type_name
      FROM violations v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countValues = [...values];
    const dataValues = [...values, limitNum, offset];

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limitNum);

      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/violations error:", error);
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

    const parsed = violationPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { property_id, violation_type_id, description, reported_by } =
      parsed.data;

    const client = await pool.connect();
    try {
      const propertyCheck = await client.query(
        "SELECT id FROM properties WHERE id = $1",
        [property_id],
      );
      if (propertyCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 },
        );
      }

      const violationTypeCheck = await client.query(
        "SELECT id FROM violation_types WHERE id = $1",
        [violation_type_id],
      );
      if (violationTypeCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation type not found" },
          { status: 404 },
        );
      }

      const insertResult = await client.query(
        `INSERT INTO violations (property_id, violation_type_id, description, reported_by, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'open', NOW(), NOW())
         RETURNING *`,
        [property_id, violation_type_id, description, reported_by],
      );

      return NextResponse.json({ data: insertResult.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
