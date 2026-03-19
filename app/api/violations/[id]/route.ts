import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z
    .enum(["open", "pending", "resolved", "closed", "appealed"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  description: z.string().min(1).optional(),
  resolution_notes: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  fine_amount: z.number().nonnegative().nullable().optional(),
  fine_paid: z.boolean().optional(),
  location: z.string().optional(),
  violation_type: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const violationResult = await db.query(
      `SELECT 
        v.*,
        u.name AS assigned_to_name,
        u.email AS assigned_to_email,
        reporter.name AS reported_by_name,
        reporter.email AS reported_by_email
      FROM violations v
      LEFT JOIN users u ON v.assigned_to = u.id
      LEFT JOIN users reporter ON v.reported_by = reporter.id
      WHERE v.id = $1`,
      [id],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    const noticesResult = await db.query(
      `SELECT 
        n.*,
        sender.name AS sent_by_name,
        sender.email AS sent_by_email
      FROM notices n
      LEFT JOIN users sender ON n.sent_by = sender.id
      WHERE n.violation_id = $1
      ORDER BY n.created_at DESC`,
      [id],
    );

    const auditResult = await db.query(
      `SELECT 
        ae.*,
        u.name AS actor_name,
        u.email AS actor_email
      FROM audit_events ae
      LEFT JOIN users u ON ae.actor_id = u.id
      WHERE ae.entity_type = 'violation' AND ae.entity_id = $1
      ORDER BY ae.created_at DESC`,
      [id],
    );

    return NextResponse.json({
      violation: {
        ...violation,
        notices: noticesResult.rows,
        audit_events: auditResult.rows,
      },
    });
  } catch (error) {
    console.error("GET /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = patchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const updates = parseResult.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const existingResult = await db.query(
      "SELECT id FROM violations WHERE id = $1",
      [id],
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      status: "status",
      severity: "severity",
      description: "description",
      resolution_notes: "resolution_notes",
      assigned_to: "assigned_to",
      due_date: "due_date",
      fine_amount: "fine_amount",
      fine_paid: "fine_paid",
      location: "location",
      violation_type: "violation_type",
      metadata: "metadata",
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in updates) {
        const value = updates[key as keyof typeof updates];
        if (key === "metadata" && value !== undefined && value !== null) {
          setClauses.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(value ?? null);
        }
        paramIndex++;
      }
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);
    const updateQuery = `
      UPDATE violations
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, values);
    const updatedViolation = updateResult.rows[0];

    try {
      await db.query(
        `INSERT INTO audit_events (entity_type, entity_id, actor_id, action, changes, created_at)
         VALUES ('violation', $1, $2, 'update', $3::jsonb, NOW())`,
        [
          id,
          (session.user as { id?: string }).id ?? null,
          JSON.stringify(updates),
        ],
      );
    } catch (auditError) {
      console.error("Failed to create audit event:", auditError);
    }

    return NextResponse.json({ violation: updatedViolation });
  } catch (error) {
    console.error("PATCH /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
