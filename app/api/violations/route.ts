import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  unit_id: z.number().int().positive().optional(),
  tenant_id: z.number().int().positive().optional(),
  violation_type: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  reported_date: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

const listViolationsSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  property_id: z.coerce.number().int().positive().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = listViolationsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, property_id, severity, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      values.push(status);
    }

    if (property_id) {
      conditions.push(`v.property_id = $${paramIndex++}`);
      values.push(property_id);
    }

    if (severity) {
      conditions.push(`v.severity = $${paramIndex++}`);
      values.push(severity);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) as total FROM violations v ${whereClause}`,
      values,
    );

    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

    const dataValues = [...values, limit, offset];
    const violationsResult = await query(
      `SELECT
        v.id,
        v.property_id,
        v.unit_id,
        v.tenant_id,
        v.violation_type,
        v.description,
        v.status,
        v.severity,
        v.reported_date,
        v.due_date,
        v.notes,
        v.created_at,
        v.updated_at,
        p.name as property_name,
        u.unit_number,
        t.first_name as tenant_first_name,
        t.last_name as tenant_last_name
      FROM violations v
      LEFT JOIN properties p ON p.id = v.property_id
      LEFT JOIN units u ON u.id = v.unit_id
      LEFT JOIN tenants t ON t.id = v.tenant_id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataValues,
    );

    return NextResponse.json({
      data: violationsResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
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

    const parsed = createViolationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const {
      property_id,
      unit_id,
      tenant_id,
      violation_type,
      description,
      status,
      severity,
      reported_date,
      due_date,
      notes,
    } = parsed.data;

    const violationResult = await query(
      `INSERT INTO violations (
        property_id,
        unit_id,
        tenant_id,
        violation_type,
        description,
        status,
        severity,
        reported_date,
        due_date,
        notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        property_id,
        unit_id ?? null,
        tenant_id ?? null,
        violation_type,
        description,
        status,
        severity,
        reported_date ?? null,
        due_date ?? null,
        notes ?? null,
      ],
    );

    const violation = violationResult.rows[0];

    const userId = (session.user as { id?: string | number }).id ?? null;

    await query(
      `INSERT INTO audit_entries (
        entity_type,
        entity_id,
        action,
        performed_by,
        details,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        "violation",
        violation.id,
        "created",
        userId,
        JSON.stringify({
          property_id,
          violation_type,
          status,
          severity,
        }),
      ],
    );

    return NextResponse.json({ data: violation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
