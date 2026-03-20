import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  community_id: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  status: z
    .enum(["open", "pending", "resolved", "closed"])
    .optional()
    .default("open"),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
  due_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  assigned_to: z.number().int().positive().optional().nullable(),
});

const getViolationsQuerySchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  property_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  community_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get("status") ?? undefined,
      property_id: searchParams.get("property_id") ?? undefined,
      category_id: searchParams.get("category_id") ?? undefined,
      community_id: searchParams.get("community_id") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = getViolationsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, property_id, category_id, community_id, page, limit } =
      parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      values.push(status);
    }
    if (property_id) {
      conditions.push(`v.property_id = $${paramIndex++}`);
      values.push(property_id);
    }
    if (category_id) {
      conditions.push(`v.category_id = $${paramIndex++}`);
      values.push(category_id);
    }
    if (community_id) {
      conditions.push(`v.community_id = $${paramIndex++}`);
      values.push(community_id);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.property_id,
        v.category_id,
        v.community_id,
        v.description,
        v.status,
        v.severity,
        v.due_date,
        v.notes,
        v.assigned_to,
        v.created_at,
        v.updated_at,
        p.address as property_address,
        vc.name as category_name,
        c.name as community_name,
        u.name as assigned_to_name
      FROM violations v
      LEFT JOIN properties p ON p.id = v.property_id
      LEFT JOIN violation_categories vc ON vc.id = v.category_id
      LEFT JOIN communities c ON c.id = v.community_id
      LEFT JOIN users u ON u.id = v.assigned_to
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, values),
        client.query(dataQuery, [...values, limit, offset]),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
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
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createViolationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      property_id,
      category_id,
      community_id,
      description,
      status,
      severity,
      due_date,
      notes,
      assigned_to,
    } = parsed.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO violations (
          property_id,
          category_id,
          community_id,
          description,
          status,
          severity,
          due_date,
          notes,
          assigned_to,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          NOW(), NOW()
        )
        RETURNING
          id,
          property_id,
          category_id,
          community_id,
          description,
          status,
          severity,
          due_date,
          notes,
          assigned_to,
          created_at,
          updated_at`,
        [
          property_id,
          category_id,
          community_id,
          description,
          status,
          severity,
          due_date ?? null,
          notes ?? null,
          assigned_to ?? null,
        ],
      );

      return NextResponse.json({ data: result.rows[0] }, { status: 201 });
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
