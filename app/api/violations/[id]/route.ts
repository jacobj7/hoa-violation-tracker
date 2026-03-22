import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ["under_review", "closed", "appealed"],
  under_review: ["open", "resolved", "closed", "appealed"],
  resolved: ["closed", "appealed"],
  appealed: ["open", "under_review", "resolved", "closed"],
  closed: [],
};

const PatchSchema = z.object({
  status: z
    .enum(["open", "under_review", "resolved", "appealed", "closed"])
    .optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
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
          v.description,
          v.status,
          v.notes,
          v.created_at,
          v.updated_at,
          v.inspection_date,
          v.due_date,
          v.severity,
          p.id AS property_id,
          p.address AS property_address,
          p.city AS property_city,
          p.state AS property_state,
          p.zip AS property_zip,
          p.owner_name AS property_owner_name,
          p.owner_email AS property_owner_email,
          p.owner_phone AS property_owner_phone,
          vc.id AS category_id,
          vc.name AS category_name,
          vc.description AS category_description,
          vc.code AS category_code,
          u.id AS inspector_id,
          u.name AS inspector_name,
          u.email AS inspector_email
        FROM violations v
        LEFT JOIN properties p ON v.property_id = p.id
        LEFT JOIN violation_categories vc ON v.category_id = vc.id
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

      const evidenceResult = await client.query(
        `
        SELECT
          ep.id,
          ep.url,
          ep.filename,
          ep.caption,
          ep.uploaded_at,
          ep.file_size,
          ep.mime_type
        FROM evidence_photos ep
        WHERE ep.violation_id = $1
        ORDER BY ep.uploaded_at ASC
        `,
        [id],
      );

      const noticesResult = await client.query(
        `
        SELECT
          n.id,
          n.type,
          n.sent_at,
          n.delivered_at,
          n.content,
          n.recipient_email,
          n.status AS notice_status
        FROM notices n
        WHERE n.violation_id = $1
        ORDER BY n.sent_at DESC
        `,
        [id],
      );

      const finesResult = await client.query(
        `
        SELECT
          f.id,
          f.amount,
          f.issued_at,
          f.due_date AS fine_due_date,
          f.paid_at,
          f.status AS fine_status,
          f.description AS fine_description
        FROM fines f
        WHERE f.violation_id = $1
        ORDER BY f.issued_at DESC
        `,
        [id],
      );

      const appealsResult = await client.query(
        `
        SELECT
          a.id,
          a.reason,
          a.status AS appeal_status,
          a.submitted_at,
          a.resolved_at,
          a.resolution_notes,
          a.appellant_name,
          a.appellant_email
        FROM appeals a
        WHERE a.violation_id = $1
        ORDER BY a.submitted_at DESC
        `,
        [id],
      );

      const violation = {
        id: row.id,
        description: row.description,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        inspection_date: row.inspection_date,
        due_date: row.due_date,
        severity: row.severity,
        property: row.property_id
          ? {
              id: row.property_id,
              address: row.property_address,
              city: row.property_city,
              state: row.property_state,
              zip: row.property_zip,
              owner_name: row.property_owner_name,
              owner_email: row.property_owner_email,
              owner_phone: row.property_owner_phone,
            }
          : null,
        category: row.category_id
          ? {
              id: row.category_id,
              name: row.category_name,
              description: row.category_description,
              code: row.category_code,
            }
          : null,
        inspector: row.inspector_id
          ? {
              id: row.inspector_id,
              name: row.inspector_name,
              email: row.inspector_email,
            }
          : null,
        evidence_photos: evidenceResult.rows,
        notices: noticesResult.rows,
        fines: finesResult.rows,
        appeals: appealsResult.rows,
      };

      return NextResponse.json({ violation });
    } finally {
      client.release();
    }
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
    const session = await getServerSession();
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = PatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const { status: newStatus, notes } = parseResult.data;

    if (!newStatus && notes === undefined) {
      return NextResponse.json(
        { error: "At least one of status or notes must be provided" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const existingResult = await client.query(
        "SELECT id, status FROM violations WHERE id = $1",
        [id],
      );

      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const currentStatus = existingResult.rows[0].status;

      if (newStatus && newStatus !== currentStatus) {
        const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
        if (!allowedNext.includes(newStatus)) {
          return NextResponse.json(
            {
              error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
              allowed_transitions: allowedNext,
            },
            { status: 422 },
          );
        }
      }

      const setClauses: string[] = ["updated_at = NOW()"];
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (newStatus !== undefined) {
        setClauses.push(`status = $${paramIndex}`);
        queryParams.push(newStatus);
        paramIndex++;
      }

      if (notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        queryParams.push(notes);
        paramIndex++;
      }

      queryParams.push(id);

      const updateResult = await client.query(
        `
        UPDATE violations
        SET ${setClauses.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          description,
          status,
          notes,
          created_at,
          updated_at,
          inspection_date,
          due_date,
          severity,
          property_id,
          category_id,
          inspector_id
        `,
        queryParams,
      );

      const updated = updateResult.rows[0];

      return NextResponse.json({
        violation: updated,
        message: "Violation updated successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PATCH /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
