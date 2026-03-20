import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const idSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parseResult = idSchema.safeParse(params.id);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid violation ID format" },
        { status: 400 },
      );
    }

    const violationId = parseResult.data;
    const client = await pool.connect();

    try {
      const violationQuery = await client.query(
        `
        SELECT
          v.id AS violation_id,
          v.code AS violation_code,
          v.description AS violation_description,
          v.status AS violation_status,
          v.severity AS violation_severity,
          v.created_at AS violation_created_at,
          v.updated_at AS violation_updated_at,
          v.notes AS violation_notes,

          p.id AS property_id,
          p.address AS property_address,
          p.city AS property_city,
          p.state AS property_state,
          p.zip AS property_zip,
          p.parcel_number AS property_parcel_number,
          p.property_type AS property_type,
          p.created_at AS property_created_at,

          o.id AS owner_id,
          o.first_name AS owner_first_name,
          o.last_name AS owner_last_name,
          o.email AS owner_email,
          o.phone AS owner_phone,
          o.mailing_address AS owner_mailing_address,
          o.created_at AS owner_created_at

        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN owners o ON p.owner_id = o.id
        WHERE v.id = $1
        `,
        [violationId],
      );

      if (violationQuery.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const row = violationQuery.rows[0];

      const inspectionsQuery = await client.query(
        `
        SELECT
          id,
          inspector_name,
          inspection_date,
          result,
          notes,
          follow_up_required,
          follow_up_date,
          created_at
        FROM inspections
        WHERE violation_id = $1
        ORDER BY inspection_date DESC
        `,
        [violationId],
      );

      const finesQuery = await client.query(
        `
        SELECT
          id,
          amount,
          issued_date,
          due_date,
          paid_date,
          status,
          payment_method,
          notes,
          created_at
        FROM fines
        WHERE violation_id = $1
        ORDER BY issued_date DESC
        `,
        [violationId],
      );

      const hearingsQuery = await client.query(
        `
        SELECT
          id,
          hearing_date,
          hearing_type,
          location,
          outcome,
          officer_name,
          notes,
          continued_to,
          created_at
        FROM hearings
        WHERE violation_id = $1
        ORDER BY hearing_date DESC
        `,
        [violationId],
      );

      const auditQuery = await client.query(
        `
        SELECT
          id,
          action,
          performed_by,
          performed_at,
          old_values,
          new_values,
          ip_address,
          notes
        FROM audit_entries
        WHERE violation_id = $1
        ORDER BY performed_at DESC
        `,
        [violationId],
      );

      const violation = {
        id: row.violation_id,
        code: row.violation_code,
        description: row.violation_description,
        status: row.violation_status,
        severity: row.violation_severity,
        notes: row.violation_notes,
        created_at: row.violation_created_at,
        updated_at: row.violation_updated_at,
        property: row.property_id
          ? {
              id: row.property_id,
              address: row.property_address,
              city: row.property_city,
              state: row.property_state,
              zip: row.property_zip,
              parcel_number: row.property_parcel_number,
              property_type: row.property_type,
              created_at: row.property_created_at,
              owner: row.owner_id
                ? {
                    id: row.owner_id,
                    first_name: row.owner_first_name,
                    last_name: row.owner_last_name,
                    email: row.owner_email,
                    phone: row.owner_phone,
                    mailing_address: row.owner_mailing_address,
                    created_at: row.owner_created_at,
                  }
                : null,
            }
          : null,
        inspections: inspectionsQuery.rows,
        fines: finesQuery.rows,
        hearings: hearingsQuery.rows,
        audit_entries: auditQuery.rows,
      };

      return NextResponse.json({ data: violation }, { status: 200 });
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
