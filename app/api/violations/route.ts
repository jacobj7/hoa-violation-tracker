import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  inspector_id: z.number().int().positive(),
  description: z.string().min(1).max(5000),
  cure_deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "cure_deadline must be a valid date string",
  }),
  status: z
    .enum(["open", "closed", "pending", "resolved"])
    .optional()
    .default("open"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const offset = (page - 1) * limit;

    const status = searchParams.get("status");
    const property_id = searchParams.get("property_id");
    const category_id = searchParams.get("category_id");
    const inspector_id = searchParams.get("inspector_id");

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      params.push(status);
    }

    if (property_id) {
      const pid = parseInt(property_id, 10);
      if (!isNaN(pid)) {
        conditions.push(`v.property_id = $${paramIndex++}`);
        params.push(pid);
      }
    }

    if (category_id) {
      const cid = parseInt(category_id, 10);
      if (!isNaN(cid)) {
        conditions.push(`v.category_id = $${paramIndex++}`);
        params.push(cid);
      }
    }

    if (inspector_id) {
      const iid = parseInt(inspector_id, 10);
      if (!isNaN(iid)) {
        conditions.push(`v.inspector_id = $${paramIndex++}`);
        params.push(iid);
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM violations v
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.property_id,
        v.category_id,
        v.inspector_id,
        v.description,
        v.status,
        v.cure_deadline,
        v.created_at,
        v.updated_at
      FROM violations v
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, params),
        client.query(dataQuery, [...params, limit, offset]),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const rows = dataResult.rows;

      return NextResponse.json({
        data: rows,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createViolationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const {
      property_id,
      category_id,
      inspector_id,
      description,
      cure_deadline,
      status,
    } = parseResult.data;

    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO violations (property_id, category_id, inspector_id, description, cure_deadline, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, property_id, category_id, inspector_id, description, status, cure_deadline, created_at, updated_at
      `;

      const result = await client.query(insertQuery, [
        property_id,
        category_id,
        inspector_id,
        description,
        new Date(cure_deadline).toISOString(),
        status,
      ]);

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
