import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignInspectorSchema = z.object({
  inspector_id: z.string().uuid("Invalid inspector ID"),
  scheduled_date: z.string().datetime("Invalid scheduled date"),
  notes: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const violationId = params.id;

  if (!violationId) {
    return NextResponse.json(
      { error: "Violation ID is required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = assignInspectorSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    );
  }

  const { inspector_id, scheduled_date, notes } = parseResult.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      `SELECT id, status FROM violations WHERE id = $1 FOR UPDATE`,
      [violationId],
    );

    if (violationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    if (violation.status === "closed" || violation.status === "resolved") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Cannot assign inspector to a violation with status '${violation.status}'`,
        },
        { status: 409 },
      );
    }

    const inspectorResult = await client.query(
      `SELECT id FROM users WHERE id = $1`,
      [inspector_id],
    );

    if (inspectorResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Inspector not found" },
        { status: 404 },
      );
    }

    const inspectionResult = await client.query(
      `INSERT INTO inspections (violation_id, inspector_id, scheduled_date, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'scheduled', NOW(), NOW())
       RETURNING *`,
      [violationId, inspector_id, scheduled_date, notes ?? null],
    );

    const inspection = inspectionResult.rows[0];

    await client.query(
      `UPDATE violations SET status = 'under_inspection', updated_at = NOW() WHERE id = $1`,
      [violationId],
    );

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details, created_at)
       VALUES ('violation', $1, 'inspection_assigned', $2, $3, NOW())`,
      [
        violationId,
        session.user.email ?? session.user.name ?? "unknown",
        JSON.stringify({
          inspection_id: inspection.id,
          inspector_id,
          scheduled_date,
          previous_status: violation.status,
          new_status: "under_inspection",
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Inspector assigned successfully",
        inspection,
        violation_status: "under_inspection",
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error assigning inspector to violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
