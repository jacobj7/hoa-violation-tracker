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
  description: z.string().min(1).max(5000),
  status: z
    .enum(["open", "in_progress", "resolved", "closed"])
    .optional()
    .default("open"),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
  reported_date: z.string().optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const property_id = searchParams.get("property_id");

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (property_id) {
      const parsedPropertyId = parseInt(property_id, 10);
      if (!isNaN(parsedPropertyId)) {
        conditions.push(`v.property_id = $${paramIndex}`);
        values.push(parsedPropertyId);
        paramIndex++;
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        v.id,
        v.property_id,
        v.category_id,
        v.description,
        v.status,
        v.severity,
        v.reported_date,
        v.due_date,
        v.notes,
        v.created_at,
        v.updated_at,
        p.name AS property_name,
        p.address AS property_address,
        c.name AS category_name,
        c.code AS category_code
      FROM violations v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN violation_categories c ON v.category_id = c.id
      ${whereClause}
      ORDER BY v.created_at DESC
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json({ violations: result.rows }, { status: 200 });
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

    const parseResult = createViolationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const {
      property_id,
      category_id,
      description,
      status,
      severity,
      reported_date,
      due_date,
      notes,
    } = parseResult.data;

    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO violations (
          property_id,
          category_id,
          description,
          status,
          severity,
          reported_date,
          due_date,
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          NOW(), NOW()
        )
        RETURNING
          id,
          property_id,
          category_id,
          description,
          status,
          severity,
          reported_date,
          due_date,
          notes,
          created_at,
          updated_at
      `;

      const values = [
        property_id,
        category_id,
        description,
        status,
        severity,
        reported_date ?? new Date().toISOString().split("T")[0],
        due_date ?? null,
        notes ?? null,
      ];

      const result = await client.query(insertQuery, values);
      const violation = result.rows[0];

      const enrichedQuery = `
        SELECT
          v.id,
          v.property_id,
          v.category_id,
          v.description,
          v.status,
          v.severity,
          v.reported_date,
          v.due_date,
          v.notes,
          v.created_at,
          v.updated_at,
          p.name AS property_name,
          p.address AS property_address,
          c.name AS category_name,
          c.code AS category_code
        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN violation_categories c ON v.category_id = c.id
        WHERE v.id = $1
      `;

      const enrichedResult = await client.query(enrichedQuery, [violation.id]);

      return NextResponse.json(
        { violation: enrichedResult.rows[0] },
        { status: 201 },
      );
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
