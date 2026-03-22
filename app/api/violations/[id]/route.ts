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
        `SELECT
          v.id,
          v.case_number,
          v.status,
          v.description,
          v.location,
          v.violation_date,
          v.created_at,
          v.updated_at,
          v.reported_by,
          v.assigned_to,
          v.notes,
          vt.id AS violation_type_id,
          vt.name AS violation_type_name,
          vt.code AS violation_type_code,
          vt.description AS violation_type_description,
          reporter.id AS reporter_id,
          reporter.name AS reporter_name,
          reporter.email AS reporter_email,
          assignee.id AS assignee_id,
          assignee.name AS assignee_name,
          assignee.email AS assignee_email
        FROM violations v
        LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
        LEFT JOIN users reporter ON v.reported_by = reporter.id
        LEFT JOIN users assignee ON v.assigned_to = assignee.id
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

      const evidencePhotosResult = await client.query(
        `SELECT
          ep.id,
          ep.file_url,
          ep.file_name,
          ep.file_size,
          ep.mime_type,
          ep.caption,
          ep.uploaded_by,
          ep.created_at,
          u.name AS uploaded_by_name
        FROM evidence_photos ep
        LEFT JOIN users u ON ep.uploaded_by = u.id
        WHERE ep.violation_id = $1
        ORDER BY ep.created_at ASC`,
        [id],
      );

      const noticesResult = await client.query(
        `SELECT
          n.id,
          n.notice_number,
          n.type,
          n.status,
          n.issued_date,
          n.due_date,
          n.content,
          n.sent_via,
          n.sent_at,
          n.created_at,
          n.updated_at,
          issuer.id AS issued_by_id,
          issuer.name AS issued_by_name,
          issuer.email AS issued_by_email
        FROM notices n
        LEFT JOIN users issuer ON n.issued_by = issuer.id
        WHERE n.violation_id = $1
        ORDER BY n.issued_date DESC`,
        [id],
      );

      const finesResult = await client.query(
        `SELECT
          f.id,
          f.fine_number,
          f.amount,
          f.status,
          f.issued_date,
          f.due_date,
          f.paid_date,
          f.payment_method,
          f.payment_reference,
          f.notes,
          f.created_at,
          f.updated_at,
          issuer.id AS issued_by_id,
          issuer.name AS issued_by_name,
          issuer.email AS issued_by_email
        FROM fines f
        LEFT JOIN users issuer ON f.issued_by = issuer.id
        WHERE f.violation_id = $1
        ORDER BY f.issued_date DESC`,
        [id],
      );

      const appealsResult = await client.query(
        `SELECT
          a.id,
          a.appeal_number,
          a.status,
          a.reason,
          a.submitted_date,
          a.reviewed_date,
          a.decision,
          a.decision_notes,
          a.created_at,
          a.updated_at,
          submitter.id AS submitted_by_id,
          submitter.name AS submitted_by_name,
          submitter.email AS submitted_by_email,
          reviewer.id AS reviewed_by_id,
          reviewer.name AS reviewed_by_name,
          reviewer.email AS reviewed_by_email
        FROM appeals a
        LEFT JOIN users submitter ON a.submitted_by = submitter.id
        LEFT JOIN users reviewer ON a.reviewed_by = reviewer.id
        WHERE a.violation_id = $1
        ORDER BY a.submitted_date DESC`,
        [id],
      );

      const fullViolation = {
        id: violation.id,
        case_number: violation.case_number,
        status: violation.status,
        description: violation.description,
        location: violation.location,
        violation_date: violation.violation_date,
        created_at: violation.created_at,
        updated_at: violation.updated_at,
        notes: violation.notes,
        violation_type: violation.violation_type_id
          ? {
              id: violation.violation_type_id,
              name: violation.violation_type_name,
              code: violation.violation_type_code,
              description: violation.violation_type_description,
            }
          : null,
        reporter: violation.reporter_id
          ? {
              id: violation.reporter_id,
              name: violation.reporter_name,
              email: violation.reporter_email,
            }
          : null,
        assignee: violation.assignee_id
          ? {
              id: violation.assignee_id,
              name: violation.assignee_name,
              email: violation.assignee_email,
            }
          : null,
        evidence_photos: evidencePhotosResult.rows,
        notices: noticesResult.rows,
        fines: finesResult.rows,
        appeals: appealsResult.rows,
      };

      return NextResponse.json({ violation: fullViolation }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
