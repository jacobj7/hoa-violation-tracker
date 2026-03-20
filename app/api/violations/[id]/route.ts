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
      const violationQuery = `
        SELECT
          v.id,
          v.description,
          v.status,
          v.severity,
          v.incident_date,
          v.reported_date,
          v.resolved_date,
          v.notes,
          v.created_at,
          v.updated_at,

          -- Property details
          p.id AS property_id,
          p.address AS property_address,
          p.unit_number AS property_unit_number,
          p.city AS property_city,
          p.state AS property_state,
          p.zip_code AS property_zip_code,

          -- Reported by user details
          ru.id AS reported_by_id,
          ru.name AS reported_by_name,
          ru.email AS reported_by_email,

          -- Assigned to user details
          au.id AS assigned_to_id,
          au.name AS assigned_to_name,
          au.email AS assigned_to_email,

          -- Violation category details
          vc.id AS category_id,
          vc.name AS category_name,
          vc.description AS category_description,
          vc.code AS category_code

        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN users ru ON v.reported_by = ru.id
        LEFT JOIN users au ON v.assigned_to = au.id
        LEFT JOIN violation_categories vc ON v.category_id = vc.id
        WHERE v.id = $1
      `;

      const violationResult = await client.query(violationQuery, [id]);

      if (violationResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violationRow = violationResult.rows[0];

      // Fetch associated fines
      const finesQuery = `
        SELECT
          f.id,
          f.amount,
          f.status,
          f.due_date,
          f.paid_date,
          f.payment_method,
          f.notes,
          f.created_at,
          f.updated_at
        FROM fines f
        WHERE f.violation_id = $1
        ORDER BY f.created_at DESC
      `;

      const finesResult = await client.query(finesQuery, [id]);

      // Fetch associated notices
      const noticesQuery = `
        SELECT
          n.id,
          n.type,
          n.status,
          n.sent_date,
          n.delivery_method,
          n.content,
          n.notes,
          n.created_at,
          n.updated_at
        FROM notices n
        WHERE n.violation_id = $1
        ORDER BY n.created_at DESC
      `;

      const noticesResult = await client.query(noticesQuery, [id]);

      // Fetch associated appeals
      const appealsQuery = `
        SELECT
          a.id,
          a.status,
          a.reason,
          a.submitted_date,
          a.reviewed_date,
          a.decision,
          a.decision_notes,
          a.created_at,
          a.updated_at,
          u.id AS submitted_by_id,
          u.name AS submitted_by_name,
          u.email AS submitted_by_email
        FROM appeals a
        LEFT JOIN users u ON a.submitted_by = u.id
        WHERE a.violation_id = $1
        ORDER BY a.created_at DESC
      `;

      const appealsResult = await client.query(appealsQuery, [id]);

      // Construct the response object
      const violation = {
        id: violationRow.id,
        description: violationRow.description,
        status: violationRow.status,
        severity: violationRow.severity,
        incident_date: violationRow.incident_date,
        reported_date: violationRow.reported_date,
        resolved_date: violationRow.resolved_date,
        notes: violationRow.notes,
        created_at: violationRow.created_at,
        updated_at: violationRow.updated_at,

        property: violationRow.property_id
          ? {
              id: violationRow.property_id,
              address: violationRow.property_address,
              unit_number: violationRow.property_unit_number,
              city: violationRow.property_city,
              state: violationRow.property_state,
              zip_code: violationRow.property_zip_code,
            }
          : null,

        reported_by: violationRow.reported_by_id
          ? {
              id: violationRow.reported_by_id,
              name: violationRow.reported_by_name,
              email: violationRow.reported_by_email,
            }
          : null,

        assigned_to: violationRow.assigned_to_id
          ? {
              id: violationRow.assigned_to_id,
              name: violationRow.assigned_to_name,
              email: violationRow.assigned_to_email,
            }
          : null,

        category: violationRow.category_id
          ? {
              id: violationRow.category_id,
              name: violationRow.category_name,
              description: violationRow.category_description,
              code: violationRow.category_code,
            }
          : null,

        fines: finesResult.rows.map((fine) => ({
          id: fine.id,
          amount: fine.amount,
          status: fine.status,
          due_date: fine.due_date,
          paid_date: fine.paid_date,
          payment_method: fine.payment_method,
          notes: fine.notes,
          created_at: fine.created_at,
          updated_at: fine.updated_at,
        })),

        notices: noticesResult.rows.map((notice) => ({
          id: notice.id,
          type: notice.type,
          status: notice.status,
          sent_date: notice.sent_date,
          delivery_method: notice.delivery_method,
          content: notice.content,
          notes: notice.notes,
          created_at: notice.created_at,
          updated_at: notice.updated_at,
        })),

        appeals: appealsResult.rows.map((appeal) => ({
          id: appeal.id,
          status: appeal.status,
          reason: appeal.reason,
          submitted_date: appeal.submitted_date,
          reviewed_date: appeal.reviewed_date,
          decision: appeal.decision,
          decision_notes: appeal.decision_notes,
          created_at: appeal.created_at,
          updated_at: appeal.updated_at,
          submitted_by: appeal.submitted_by_id
            ? {
                id: appeal.submitted_by_id,
                name: appeal.submitted_by_name,
                email: appeal.submitted_by_email,
              }
            : null,
        })),
      };

      return NextResponse.json({ violation }, { status: 200 });
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
