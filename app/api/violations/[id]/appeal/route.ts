import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PostAppealSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(5000),
});

const PatchAppealSchema = z.object({
  status: z.enum(["approved", "denied"]),
  board_notes: z.string().max(5000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
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

    const body = await request.json();
    const parsed = PostAppealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { reason } = parsed.data;
    const userEmail = session.user.email;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify violation exists and user is the owner
      const violationResult = await client.query(
        `SELECT v.*, u.email as owner_email
         FROM violations v
         LEFT JOIN users u ON v.owner_id = u.id
         WHERE v.id = $1`,
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

      if (violation.owner_email !== userEmail) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Forbidden: You are not the owner of this violation" },
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

      // Insert appeal record
      const appealResult = await client.query(
        `INSERT INTO appeals (violation_id, owner_id, reason, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())
         RETURNING *`,
        [violationId, violation.owner_id, reason],
      );

      // Update violation status to 'appealed'
      await client.query(
        `UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Appeal submitted successfully",
          appeal: appealResult.rows[0],
        },
        { status: 201 },
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/violations/[id]/appeal error:", error);
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

    const body = await request.json();
    const parsed = PatchAppealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { status, board_notes } = parsed.data;
    const userEmail = session.user.email;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify user is a board member
      const boardMemberResult = await client.query(
        `SELECT u.id, u.role FROM users u WHERE u.email = $1`,
        [userEmail],
      );

      if (boardMemberResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const user = boardMemberResult.rows[0];
      if (user.role !== "board" && user.role !== "admin") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Forbidden: Only board members can update appeal status" },
          { status: 403 },
        );
      }

      // Verify violation exists and has an appeal
      const violationResult = await client.query(
        `SELECT v.* FROM violations v WHERE v.id = $1`,
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
      if (violation.status !== "appealed") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "No pending appeal found for this violation" },
          { status: 409 },
        );
      }

      // Update appeal record
      const appealUpdateResult = await client.query(
        `UPDATE appeals
         SET status = $1, board_notes = $2, decided_at = NOW(), decided_by = $3, updated_at = NOW()
         WHERE violation_id = $4 AND status = 'pending'
         RETURNING *`,
        [status, board_notes || null, user.id, violationId],
      );

      if (appealUpdateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "No pending appeal found to update" },
          { status: 404 },
        );
      }

      // Update violation status based on appeal decision
      const newViolationStatus = status === "approved" ? "resolved" : "open";
      await client.query(
        `UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newViolationStatus, violationId],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: `Appeal ${status} successfully`,
          appeal: appealUpdateResult.rows[0],
        },
        { status: 200 },
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PATCH /api/violations/[id]/appeal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
