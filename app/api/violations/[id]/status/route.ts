import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const StatusUpdateSchema = z.object({
  status: z.enum([
    "open",
    "notified",
    "fined",
    "resolved",
    "closed",
    "appealed",
  ]),
  notes: z.string().optional(),
});

type ViolationStatus =
  | "open"
  | "notified"
  | "fined"
  | "resolved"
  | "closed"
  | "appealed";

const VALID_TRANSITIONS: Record<ViolationStatus, ViolationStatus[]> = {
  open: ["notified", "closed", "appealed"],
  notified: ["fined", "closed", "appealed"],
  fined: ["resolved", "closed", "appealed"],
  resolved: ["appealed"],
  closed: ["appealed"],
  appealed: ["open", "notified", "fined", "resolved", "closed"],
};

function isValidTransition(
  from: ViolationStatus,
  to: ViolationStatus,
): boolean {
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
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

  const parseResult = StatusUpdateSchema.safeParse(body);
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

    if (violationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];
    const currentStatus = violation.status as ViolationStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Invalid status transition",
          message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
          allowedTransitions: VALID_TRANSITIONS[currentStatus],
        },
        { status: 409 },
      );
    }

    const updateResult = await client.query(
      `UPDATE violations
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [newStatus, id],
    );

    await client.query(
      `INSERT INTO violation_status_history (violation_id, from_status, to_status, notes, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT DO NOTHING`,
      [
        id,
        currentStatus,
        newStatus,
        notes || null,
        session.user.email || session.user.name || "unknown",
      ],
    );

    await client.query("COMMIT");

    const updatedViolation = updateResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        violation: {
          id: updatedViolation.id,
          status: updatedViolation.status,
          updatedAt: updatedViolation.updated_at,
          previousStatus: currentStatus,
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
