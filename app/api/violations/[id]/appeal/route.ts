import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AppealPostSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  supporting_documents: z.array(z.string().url()).optional().default([]),
});

const AppealPatchSchema = z.object({
  appeal_id: z.string().uuid("Invalid appeal ID"),
  action: z.enum(["approve", "deny"]),
  manager_notes: z.string().optional().default(""),
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

  const parseResult = AppealPostSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { reason, supporting_documents } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      `SELECT id, status, owner_id FROM violations WHERE id = $1 FOR UPDATE`,
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

    const userEmail = session.user.email;
    const userResult = await client.query(
      `SELECT id, role FROM users WHERE email = $1`,
      [userEmail],
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (violation.owner_id !== user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Forbidden: Only the owner can submit an appeal" },
        { status: 403 },
      );
    }

    if (violation.status === "appealed") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "An appeal has already been submitted for this violation" },
        { status: 409 },
      );
    }

    if (!["open", "pending"].includes(violation.status)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Cannot appeal a violation with status '${violation.status}'`,
        },
        { status: 400 },
      );
    }

    const appealResult = await client.query(
      `INSERT INTO appeals (violation_id, submitted_by, reason, supporting_documents, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
       RETURNING *`,
      [violationId, user.id, reason, JSON.stringify(supporting_documents)],
    );

    const appeal = appealResult.rows[0];

    await client.query(
      `UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
      [violationId],
    );

    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, performed_by, metadata, created_at)
       VALUES ('violation', $1, 'appeal_submitted', $2, $3, NOW())`,
      [
        violationId,
        user.id,
        JSON.stringify({
          appeal_id: appeal.id,
          reason,
          supporting_documents,
          previous_status: violation.status,
          new_status: "appealed",
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Appeal submitted successfully",
        appeal,
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting appeal:", error);
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

  const parseResult = AppealPatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { appeal_id, action, manager_notes } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userEmail = session.user.email;
    const userResult = await client.query(
      `SELECT id, role FROM users WHERE email = $1`,
      [userEmail],
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!["manager", "admin"].includes(user.role)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Forbidden: Only managers or admins can approve/deny appeals",
        },
        { status: 403 },
      );
    }

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

    const appealResult = await client.query(
      `SELECT id, status, violation_id FROM appeals WHERE id = $1 AND violation_id = $2 FOR UPDATE`,
      [appeal_id, violationId],
    );

    if (appealResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Appeal not found for this violation" },
        { status: 404 },
      );
    }

    const appeal = appealResult.rows[0];

    if (appeal.status !== "pending") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Appeal has already been ${appeal.status}` },
        { status: 409 },
      );
    }

    const newAppealStatus = action === "approve" ? "approved" : "denied";
    const newViolationStatus = action === "approve" ? "resolved" : "open";

    const updatedAppealResult = await client.query(
      `UPDATE appeals
       SET status = $1, manager_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newAppealStatus, manager_notes, user.id, appeal_id],
    );

    const updatedAppeal = updatedAppealResult.rows[0];

    await client.query(
      `UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newViolationStatus, violationId],
    );

    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, performed_by, metadata, created_at)
       VALUES ('violation', $1, $2, $3, $4, NOW())`,
      [
        violationId,
        action === "approve" ? "appeal_approved" : "appeal_denied",
        user.id,
        JSON.stringify({
          appeal_id,
          manager_notes,
          previous_appeal_status: "pending",
          new_appeal_status: newAppealStatus,
          previous_violation_status: violation.status,
          new_violation_status: newViolationStatus,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: `Appeal ${newAppealStatus} successfully`,
        appeal: updatedAppeal,
        violation_status: newViolationStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing appeal decision:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
