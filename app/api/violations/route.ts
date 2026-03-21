import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z
    .enum(["open", "in_progress", "resolved", "closed"])
    .optional()
    .default("open"),
  category: z.string().min(1).max(100),
  location: z.string().max(255).optional(),
  reported_by: z.string().max(255).optional(),
  assigned_to: z.string().max(255).optional(),
  due_date: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const listViolationsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sort_by: z
    .enum(["created_at", "updated_at", "severity", "status", "title"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const parseResult = listViolationsSchema.safeParse(queryParams);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    page,
    limit,
    severity,
    status,
    category,
    search,
    sort_by,
    sort_order,
  } = parseResult.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (severity) {
    conditions.push(`severity = $${paramIndex++}`);
    values.push(severity);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (category) {
    conditions.push(`category ILIKE $${paramIndex++}`);
    values.push(`%${category}%`);
  }

  if (search) {
    conditions.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`,
    );
    values.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const allowedSortColumns: Record<string, string> = {
    created_at: "created_at",
    updated_at: "updated_at",
    severity: "severity",
    status: "status",
    title: "title",
  };
  const sortColumn = allowedSortColumns[sort_by] ?? "created_at";
  const sortDirection = sort_order === "asc" ? "ASC" : "DESC";

  const client = await pool.connect();
  try {
    const countQuery = `SELECT COUNT(*) FROM violations ${whereClause}`;
    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT
        id,
        title,
        description,
        severity,
        status,
        category,
        location,
        reported_by,
        assigned_to,
        due_date,
        metadata,
        created_at,
        updated_at
      FROM violations
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const dataResult = await client.query(dataQuery, values);

    return NextResponse.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
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

  const parseResult = createViolationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const {
    title,
    description,
    severity,
    status,
    category,
    location,
    reported_by,
    assigned_to,
    due_date,
    metadata,
  } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO violations (
        title,
        description,
        severity,
        status,
        category,
        location,
        reported_by,
        assigned_to,
        due_date,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        title,
        description,
        severity,
        status,
        category,
        location ?? null,
        reported_by ?? (session.user.email || session.user.name || null),
        assigned_to ?? null,
        due_date ?? null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    const newViolation = insertResult.rows[0];

    await client.query(
      `INSERT INTO audit_log (
        action,
        entity_type,
        entity_id,
        user_id,
        user_email,
        changes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        "CREATE",
        "violation",
        newViolation.id,
        (session.user as { id?: string }).id ?? null,
        session.user.email ?? null,
        JSON.stringify({ new: newViolation }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({ data: newViolation }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
