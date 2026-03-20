import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PatchSchema = z.object({
  status: z.enum(["open", "in_review", "resolved", "closed", "dismissed"]),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const result = await client.query(
      `
      SELECT
        v.*,
        EXTRACT(DAY FROM (NOW() - v.created_at)) AS days_open,
        v.base_fine * GREATEST(1, EXTRACT(DAY FROM (NOW() - v.created_at))) AS computed_fine,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vsl.id,
              'from_status', vsl.from_status,
              'to_status', vsl.to_status,
              'notes', vsl.notes,
              'changed_by', vsl.changed_by,
              'created_at', vsl.created_at
            ) ORDER BY vsl.created_at DESC
          ) FILTER (WHERE vsl.id IS NOT NULL),
          '[]'
        ) AS status_log
      FROM violations v
      LEFT JOIN violation_status_log vsl ON vsl.violation_id = v.id
      WHERE v.id = $1
      GROUP BY v.id
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = result.rows[0];

    return NextResponse.json({ data: violation }, { status: 200 });
  } catch (error) {
    console.error("GET /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      "SELECT id, status FROM violations WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (violationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const currentViolation = violationResult.rows[0];
    const fromStatus = currentViolation.status;

    if (fromStatus === newStatus) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Status is already set to the requested value" },
        { status: 409 },
      );
    }

    await client.query(
      "UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, id],
    );

    const changedBy =
      (session.user as { id?: string; email?: string })?.id ||
      session.user?.email ||
      "unknown";

    await client.query(
      `
      INSERT INTO violation_status_log (violation_id, from_status, to_status, notes, changed_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [id, fromStatus, newStatus, notes ?? null, changedBy],
    );

    await client.query("COMMIT");

    const updatedResult = await client.query(
      `
      SELECT
        v.*,
        EXTRACT(DAY FROM (NOW() - v.created_at)) AS days_open,
        v.base_fine * GREATEST(1, EXTRACT(DAY FROM (NOW() - v.created_at))) AS computed_fine
      FROM violations v
      WHERE v.id = $1
      `,
      [id],
    );

    return NextResponse.json({ data: updatedResult.rows[0] }, { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
