import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const StatusTransitionSchema = z.object({
  status: z.enum([
    "pending",
    "under_review",
    "confirmed",
    "dismissed",
    "appealed",
    "resolved",
    "closed",
  ]),
  notes: z.string().optional(),
  reviewed_by: z.string().optional(),
});

type RouteContext = {
  params: { id: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

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
          v.*,
          u.name as reporter_name,
          u.email as reporter_email,
          p.address as property_address,
          p.parcel_number,
          p.owner_name as property_owner_name
        FROM violations v
        LEFT JOIN users u ON v.reported_by = u.id
        LEFT JOIN properties p ON v.property_id = p.id
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

      const evidenceResult = await client.query(
        `SELECT 
          e.*,
          u.name as uploaded_by_name
        FROM evidence e
        LEFT JOIN users u ON e.uploaded_by = u.id
        WHERE e.violation_id = $1
        ORDER BY e.created_at DESC`,
        [id],
      );

      const finesResult = await client.query(
        `SELECT 
          f.*,
          u.name as issued_by_name
        FROM fines f
        LEFT JOIN users u ON f.issued_by = u.id
        WHERE f.violation_id = $1
        ORDER BY f.created_at DESC`,
        [id],
      );

      const hearingsResult = await client.query(
        `SELECT 
          h.*,
          u.name as scheduled_by_name
        FROM hearings h
        LEFT JOIN users u ON h.scheduled_by = u.id
        WHERE h.violation_id = $1
        ORDER BY h.scheduled_date ASC`,
        [id],
      );

      const appealsResult = await client.query(
        `SELECT 
          a.*,
          u.name as submitted_by_name,
          r.name as reviewed_by_name
        FROM appeals a
        LEFT JOIN users u ON a.submitted_by = u.id
        LEFT JOIN users r ON a.reviewed_by = r.id
        WHERE a.violation_id = $1
        ORDER BY a.created_at DESC`,
        [id],
      );

      const response = {
        ...violation,
        evidence: evidenceResult.rows,
        fines: finesResult.rows,
        hearings: hearingsResult.rows,
        appeals: appealsResult.rows,
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

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

    const parseResult = StatusTransitionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const { status, notes, reviewed_by } = parseResult.data;

    const client = await pool.connect();

    try {
      const existingResult = await client.query(
        `SELECT id, status FROM violations WHERE id = $1`,
        [id],
      );

      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const currentStatus = existingResult.rows[0].status;

      const allowedTransitions: Record<string, string[]> = {
        pending: ["under_review", "dismissed"],
        under_review: ["confirmed", "dismissed", "appealed"],
        confirmed: ["appealed", "resolved", "closed"],
        dismissed: ["closed"],
        appealed: ["under_review", "resolved", "closed"],
        resolved: ["closed"],
        closed: [],
      };

      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentStatus}' to '${status}'`,
            allowed_transitions: allowed,
          },
          { status: 409 },
        );
      }

      const updateFields: string[] = ["status = $2", "updated_at = NOW()"];
      const queryParams: unknown[] = [id, status];
      let paramIndex = 3;

      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        queryParams.push(notes);
        paramIndex++;
      }

      if (reviewed_by !== undefined) {
        updateFields.push(`reviewed_by = $${paramIndex}`);
        queryParams.push(reviewed_by);
        paramIndex++;
      }

      if (status === "resolved" || status === "closed") {
        updateFields.push(`resolved_at = $${paramIndex}`);
        queryParams.push(new Date().toISOString());
        paramIndex++;
      }

      const updateQuery = `
        UPDATE violations
        SET ${updateFields.join(", ")}
        WHERE id = $1
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, queryParams);

      await client.query(
        `INSERT INTO violation_status_history 
          (violation_id, previous_status, new_status, changed_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          id,
          currentStatus,
          status,
          (session.user as { id?: string })?.id || null,
          notes || null,
        ],
      );

      return NextResponse.json(updateResult.rows[0], { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
