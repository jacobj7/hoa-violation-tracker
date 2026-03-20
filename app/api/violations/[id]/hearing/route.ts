import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PostHearingSchema = z.object({
  appeal_reason: z.string().min(1, "Appeal reason is required"),
  requested_date: z.string().optional(),
  owner_notes: z.string().optional(),
});

const PatchHearingSchema = z.object({
  hearing_id: z.string().uuid("Invalid hearing ID"),
  outcome: z.enum(["upheld", "dismissed", "reduced", "deferred"]),
  board_notes: z.string().optional(),
  fine_amount: z.number().nonnegative().optional(),
  resolution_date: z.string().optional(),
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

  const parseResult = PostHearingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { appeal_reason, requested_date, owner_notes } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      `SELECT id, status FROM violations WHERE id = $1`,
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

    if (violation.status === "hearing_scheduled") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "A hearing is already scheduled for this violation" },
        { status: 409 },
      );
    }

    const hearingResult = await client.query(
      `INSERT INTO hearings (
        violation_id,
        appeal_reason,
        requested_date,
        owner_notes,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())
      RETURNING *`,
      [
        violationId,
        appeal_reason,
        requested_date || null,
        owner_notes || null,
        session.user.email || session.user.name,
      ],
    );

    await client.query(
      `UPDATE violations SET status = 'hearing_scheduled', updated_at = NOW() WHERE id = $1`,
      [violationId],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Hearing scheduled successfully",
        hearing: hearingResult.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating hearing:", error);
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

  const parseResult = PatchHearingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { hearing_id, outcome, board_notes, fine_amount, resolution_date } =
    parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      `SELECT id, status FROM violations WHERE id = $1`,
      [violationId],
    );

    if (violationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const hearingResult = await client.query(
      `SELECT id FROM hearings WHERE id = $1 AND violation_id = $2`,
      [hearing_id, violationId],
    );

    if (hearingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Hearing not found for this violation" },
        { status: 404 },
      );
    }

    const updatedHearingResult = await client.query(
      `UPDATE hearings SET
        outcome = $1,
        board_notes = $2,
        fine_amount = $3,
        resolution_date = $4,
        status = 'completed',
        updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [
        outcome,
        board_notes || null,
        fine_amount !== undefined ? fine_amount : null,
        resolution_date || null,
        hearing_id,
      ],
    );

    let newViolationStatus: string;
    switch (outcome) {
      case "dismissed":
        newViolationStatus = "closed";
        break;
      case "upheld":
        newViolationStatus = "upheld";
        break;
      case "reduced":
        newViolationStatus = "reduced";
        break;
      case "deferred":
        newViolationStatus = "deferred";
        break;
      default:
        newViolationStatus = "closed";
    }

    await client.query(
      `UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newViolationStatus, violationId],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Hearing outcome recorded successfully",
        hearing: updatedHearingResult.rows[0],
        violation_status: newViolationStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating hearing outcome:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
