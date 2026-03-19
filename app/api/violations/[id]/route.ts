import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      const violationResult = await client.query(
        `
        SELECT
          v.id,
          v.title,
          v.description,
          v.status,
          v.severity,
          v.location,
          v.reported_by,
          v.assigned_to,
          v.created_at,
          v.updated_at,
          v.resolved_at,
          u_reporter.name AS reporter_name,
          u_reporter.email AS reporter_email,
          u_assignee.name AS assignee_name,
          u_assignee.email AS assignee_email
        FROM violations v
        LEFT JOIN users u_reporter ON v.reported_by = u_reporter.id
        LEFT JOIN users u_assignee ON v.assigned_to = u_assignee.id
        WHERE v.id = $1
        `,
        [id],
      );

      if (violationResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violation = violationResult.rows[0];

      const finesResult = await client.query(
        `
        SELECT
          f.id,
          f.amount,
          f.currency,
          f.status,
          f.due_date,
          f.paid_at,
          f.description,
          f.created_at,
          f.updated_at
        FROM fines f
        WHERE f.violation_id = $1
        ORDER BY f.created_at DESC
        `,
        [id],
      );

      const auditLogResult = await client.query(
        `
        SELECT
          al.id,
          al.action,
          al.old_values,
          al.new_values,
          al.performed_by,
          al.created_at,
          u.name AS performed_by_name,
          u.email AS performed_by_email
        FROM audit_logs al
        LEFT JOIN users u ON al.performed_by = u.id
        WHERE al.entity_type = 'violation' AND al.entity_id = $1
        ORDER BY al.created_at DESC
        `,
        [id],
      );

      const response = {
        ...violation,
        fines: finesResult.rows,
        audit_log: auditLogResult.rows,
      };

      return NextResponse.json(response, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
