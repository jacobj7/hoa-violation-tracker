import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const statusUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "dismissed"]),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const violationId = params.id;

  if (!violationId || isNaN(Number(violationId))) {
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

  const parseResult = statusUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { status, reason } = parseResult.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      "SELECT id, status FROM violations WHERE id = $1 FOR UPDATE",
      [violationId],
    );

    if (violationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const previousStatus = violationResult.rows[0].status;

    const updateResult = await client.query(
      `UPDATE violations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, violationId],
    );

    const updatedViolation = updateResult.rows[0];

    await client.query(
      `INSERT INTO audit_log (
        entity_type,
        entity_id,
        action,
        previous_value,
        new_value,
        reason,
        performed_by,
        performed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        "violation",
        violationId,
        "status_update",
        previousStatus,
        status,
        reason ?? null,
        session.user.email ?? session.user.name ?? "unknown",
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Violation status updated successfully",
        violation: updatedViolation,
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating violation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
