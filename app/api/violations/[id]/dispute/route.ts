import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const disputeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(2000),
  evidence_description: z.string().max(1000).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(20).optional(),
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

  const parseResult = disputeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { reason, evidence_description, contact_email, contact_phone } =
    parseResult.data;

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

    if (violation.status === "disputed") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation is already disputed" },
        { status: 409 },
      );
    }

    if (violation.status === "resolved" || violation.status === "closed") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Cannot dispute a violation with status '${violation.status}'`,
        },
        { status: 409 },
      );
    }

    const disputeResult = await client.query(
      `INSERT INTO disputes (
        violation_id,
        submitted_by,
        reason,
        evidence_description,
        contact_email,
        contact_phone,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
      RETURNING *`,
      [
        violationId,
        session.user.email ?? session.user.name ?? "unknown",
        reason,
        evidence_description ?? null,
        contact_email ?? null,
        contact_phone ?? null,
      ],
    );

    const dispute = disputeResult.rows[0];

    await client.query(
      `UPDATE violations SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
      [violationId],
    );

    await client.query(
      `INSERT INTO audit_log (
        entity_type,
        entity_id,
        action,
        performed_by,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        "violation",
        violationId,
        "dispute_submitted",
        session.user.email ?? session.user.name ?? "unknown",
        JSON.stringify({
          dispute_id: dispute.id,
          previous_status: violation.status,
          new_status: "disputed",
          reason_preview: reason.substring(0, 100),
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Dispute submitted successfully",
        dispute: {
          id: dispute.id,
          violation_id: dispute.violation_id,
          status: dispute.status,
          reason: dispute.reason,
          created_at: dispute.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting dispute:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
