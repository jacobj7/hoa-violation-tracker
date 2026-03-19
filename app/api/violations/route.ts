import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const violationQuerySchema = z.object({
  status: z
    .enum(["pending", "under_review", "resolved", "dismissed"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createViolationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  location: z.string().min(1).max(500),
  severity: z.enum(["low", "medium", "high", "critical"]),
  violation_type: z.string().min(1).max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  evidence_urls: z.array(z.string().url()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    const parsed = violationQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    let whereClause = "WHERE 1=1";
    const queryValues: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND v.status = $${paramIndex}`;
      queryValues.push(status);
      paramIndex++;
    }

    // Role-scoped access
    if (userRole === "citizen") {
      whereClause += ` AND v.reported_by = $${paramIndex}`;
      queryValues.push(userId);
      paramIndex++;
    } else if (userRole === "inspector") {
      whereClause += ` AND (v.reported_by = $${paramIndex} OR v.assigned_to = $${paramIndex + 1})`;
      queryValues.push(userId, userId);
      paramIndex += 2;
    }
    // manager and admin can see all violations

    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.title,
        v.description,
        v.location,
        v.severity,
        v.violation_type,
        v.status,
        v.latitude,
        v.longitude,
        v.evidence_urls,
        v.created_at,
        v.updated_at,
        v.reported_by,
        v.assigned_to,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        assignee.name as assignee_name
      FROM violations v
      LEFT JOIN users reporter ON v.reported_by = reporter.id
      LEFT JOIN users assignee ON v.assigned_to = assignee.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryValues.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, queryValues.slice(0, -2)),
      db.query(dataQuery, queryValues),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      violations: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
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

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (!["inspector", "manager", "admin"].includes(userRole)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only inspectors and managers can create violations",
        },
        { status: 403 },
      );
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
      title,
      description,
      location,
      severity,
      violation_type,
      latitude,
      longitude,
      evidence_urls,
    } = parsed.data;

    const result = await db.query(
      `
      INSERT INTO violations (
        title,
        description,
        location,
        severity,
        violation_type,
        status,
        latitude,
        longitude,
        evidence_urls,
        reported_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING
        id,
        title,
        description,
        location,
        severity,
        violation_type,
        status,
        latitude,
        longitude,
        evidence_urls,
        reported_by,
        assigned_to,
        created_at,
        updated_at
      `,
      [
        title,
        description,
        location,
        severity,
        violation_type,
        latitude ?? null,
        longitude ?? null,
        JSON.stringify(evidence_urls),
        userId,
      ],
    );

    const violation = result.rows[0];

    return NextResponse.json({ violation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
