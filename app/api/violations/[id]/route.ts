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
      // Fetch the main violation with property, owner, and violation type
      const violationResult = await client.query(
        `
        SELECT
          v.id,
          v.status,
          v.description,
          v.occurred_at,
          v.resolved_at,
          v.created_at,
          v.updated_at,
          v.notes,
          v.severity,
          v.inspector_id,

          -- Property details
          p.id AS property_id,
          p.address AS property_address,
          p.city AS property_city,
          p.state AS property_state,
          p.zip AS property_zip,
          p.parcel_number,
          p.property_type,

          -- Owner details
          o.id AS owner_id,
          o.first_name AS owner_first_name,
          o.last_name AS owner_last_name,
          o.email AS owner_email,
          o.phone AS owner_phone,
          o.mailing_address AS owner_mailing_address,

          -- Violation type details
          vt.id AS violation_type_id,
          vt.name AS violation_type_name,
          vt.code AS violation_type_code,
          vt.description AS violation_type_description,
          vt.category AS violation_type_category,
          vt.base_fine_amount,

          -- Inspector details
          u.id AS inspector_user_id,
          u.name AS inspector_name,
          u.email AS inspector_email

        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN owners o ON p.owner_id = o.id
        LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
        LEFT JOIN users u ON v.inspector_id = u.id
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

      const row = violationResult.rows[0];

      // Fetch notices for this violation
      const noticesResult = await client.query(
        `
        SELECT
          n.id,
          n.notice_type,
          n.sent_at,
          n.delivered_at,
          n.method,
          n.content,
          n.status,
          n.created_at,
          u.name AS sent_by_name,
          u.email AS sent_by_email
        FROM notices n
        LEFT JOIN users u ON n.sent_by = u.id
        WHERE n.violation_id = $1
        ORDER BY n.sent_at DESC
        `,
        [id],
      );

      // Fetch fines for this violation
      const finesResult = await client.query(
        `
        SELECT
          f.id,
          f.amount,
          f.issued_at,
          f.due_date,
          f.paid_at,
          f.status,
          f.waived,
          f.waived_reason,
          f.created_at,
          f.updated_at
        FROM fines f
        WHERE f.violation_id = $1
        ORDER BY f.issued_at DESC
        `,
        [id],
      );

      // Fetch disputes for this violation
      const disputesResult = await client.query(
        `
        SELECT
          d.id,
          d.reason,
          d.status,
          d.submitted_at,
          d.resolved_at,
          d.resolution_notes,
          d.created_at,
          d.updated_at,
          u.name AS resolved_by_name,
          u.email AS resolved_by_email
        FROM disputes d
        LEFT JOIN users u ON d.resolved_by = u.id
        WHERE d.violation_id = $1
        ORDER BY d.submitted_at DESC
        `,
        [id],
      );

      const violation = {
        id: row.id,
        status: row.status,
        description: row.description,
        occurredAt: row.occurred_at,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        notes: row.notes,
        severity: row.severity,

        property: row.property_id
          ? {
              id: row.property_id,
              address: row.property_address,
              city: row.property_city,
              state: row.property_state,
              zip: row.property_zip,
              parcelNumber: row.parcel_number,
              propertyType: row.property_type,
            }
          : null,

        owner: row.owner_id
          ? {
              id: row.owner_id,
              firstName: row.owner_first_name,
              lastName: row.owner_last_name,
              email: row.owner_email,
              phone: row.owner_phone,
              mailingAddress: row.owner_mailing_address,
            }
          : null,

        violationType: row.violation_type_id
          ? {
              id: row.violation_type_id,
              name: row.violation_type_name,
              code: row.violation_type_code,
              description: row.violation_type_description,
              category: row.violation_type_category,
              baseFineAmount: row.base_fine_amount,
            }
          : null,

        inspector: row.inspector_user_id
          ? {
              id: row.inspector_user_id,
              name: row.inspector_name,
              email: row.inspector_email,
            }
          : null,

        notices: noticesResult.rows.map((n) => ({
          id: n.id,
          noticeType: n.notice_type,
          sentAt: n.sent_at,
          deliveredAt: n.delivered_at,
          method: n.method,
          content: n.content,
          status: n.status,
          createdAt: n.created_at,
          sentBy: n.sent_by_name
            ? {
                name: n.sent_by_name,
                email: n.sent_by_email,
              }
            : null,
        })),

        fines: finesResult.rows.map((f) => ({
          id: f.id,
          amount: f.amount,
          issuedAt: f.issued_at,
          dueDate: f.due_date,
          paidAt: f.paid_at,
          status: f.status,
          waived: f.waived,
          waivedReason: f.waived_reason,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        })),

        disputes: disputesResult.rows.map((d) => ({
          id: d.id,
          reason: d.reason,
          status: d.status,
          submittedAt: d.submitted_at,
          resolvedAt: d.resolved_at,
          resolutionNotes: d.resolution_notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          resolvedBy: d.resolved_by_name
            ? {
                name: d.resolved_by_name,
                email: d.resolved_by_email,
              }
            : null,
        })),
      };

      return NextResponse.json({ violation });
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
