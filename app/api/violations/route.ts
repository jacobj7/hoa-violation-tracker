import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  description: z.string().min(1).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  location_details: z.string().max(500).optional(),
  due_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const property_id = searchParams.get("property_id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT
        v.id,
        v.property_id,
        p.address AS property_address,
        v.category_id,
        vc.name AS category_name,
        v.description,
        v.severity,
        v.status,
        v.location_details,
        v.due_date,
        v.created_at,
        v.updated_at,
        v.created_by,
        u.name AS created_by_name
      FROM violations v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN violation_categories vc ON v.category_id = vc.id
      LEFT JOIN users u ON v.created_by = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (property_id) {
      queryText += ` AND v.property_id = $${paramIndex++}`;
      params.push(parseInt(property_id, 10));
    }

    if (status) {
      queryText += ` AND v.status = $${paramIndex++}`;
      params.push(status);
    }

    if (severity) {
      queryText += ` AND v.severity = $${paramIndex++}`;
      params.push(severity);
    }

    // Non-admin users only see violations for their assigned properties
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "manager") {
      queryText += ` AND v.created_by = $${paramIndex++}`;
      params.push(
        (session.user as { id?: string | number }).id as string | number,
      );
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS subquery`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    queryText += ` ORDER BY v.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    return NextResponse.json({
      violations: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (
    userRole !== "manager" &&
    userRole !== "inspector" &&
    userRole !== "admin"
  ) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
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
      description,
      severity,
      location_details,
      due_date,
    } = parsed.data;

    const userId = (session.user as { id?: string | number }).id;

    const result = await query(
      `INSERT INTO violations
        (property_id, category_id, description, severity, status, location_details, due_date, created_by, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, 'open', $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        property_id,
        category_id,
        description,
        severity,
        location_details || null,
        due_date || null,
        userId,
      ],
    );

    return NextResponse.json({ violation: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
