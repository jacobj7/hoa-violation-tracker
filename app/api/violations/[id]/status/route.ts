import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const VALID_STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
type ViolationStatus = (typeof VALID_STATUSES)[number];

const VALID_TRANSITIONS: Record<ViolationStatus, ViolationStatus[]> = {
  open: ["in_review", "dismissed"],
  in_review: ["resolved", "dismissed", "open"],
  resolved: ["open"],
  dismissed: ["open"],
};

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
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

  const parseResult = updateStatusSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status: newStatus, reason } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      "SELECT id, status FROM violations WHERE id = $1 FOR UPDATE",
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];
    const oldStatus = violation.status as ViolationStatus;

    if (oldStatus === newStatus) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Status is already set to the requested value" },
        { status: 400 },
      );
    }

    const allowedTransitions = VALID_TRANSITIONS[oldStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Invalid status transition from '${oldStatus}' to '${newStatus}'`,
          allowedTransitions,
        },
        { status: 422 },
      );
    }

    const updateResult = await client.query(
      `UPDATE violations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [newStatus, violationId],
    );

    const changedBy =
      (session.user as { id?: string }).id || session.user.email || "unknown";

    await client.query(
      `INSERT INTO audit_log (
        entity_type,
        entity_id,
        action,
        old_value,
        new_value,
        changed_by,
        reason,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        "violation",
        violationId,
        "status_change",
        oldStatus,
        newStatus,
        changedBy,
        reason || null,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        violation: updateResult.rows[0],
        transition: {
          from: oldStatus,
          to: newStatus,
        },
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
