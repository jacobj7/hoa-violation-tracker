import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const AppealSchema = z.object({
  reason: z
    .string()
    .min(10, "Appeal reason must be at least 10 characters")
    .max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const violationId = params.id;

    if (!violationId || isNaN(Number(violationId))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = AppealSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { reason } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        `SELECT v.*, u.email as owner_email, u.id as owner_id
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

      if (violation.owner_email !== session.user.email) {
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

      if (violation.status === "resolved" || violation.status === "dismissed") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:
              "Cannot appeal a violation that is already resolved or dismissed",
          },
          { status: 400 },
        );
      }

      const appealResult = await client.query(
        `INSERT INTO appeals (violation_id, owner_id, reason, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', NOW(), NOW())
         RETURNING *`,
        [violationId, violation.owner_id, reason],
      );

      const appeal = appealResult.rows[0];

      const previousStatus = violation.status;

      await client.query(
        `UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await client.query(
        `INSERT INTO violation_status_log (violation_id, previous_status, new_status, changed_by, change_reason, created_at)
         VALUES ($1, $2, 'appealed', $3, $4, NOW())`,
        [
          violationId,
          previousStatus,
          session.user.email,
          `Appeal submitted: ${reason.substring(0, 100)}${reason.length > 100 ? "..." : ""}`,
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Appeal submitted successfully",
          appeal: {
            id: appeal.id,
            violation_id: appeal.violation_id,
            reason: appeal.reason,
            status: appeal.status,
            created_at: appeal.created_at,
          },
          violation_status: "appealed",
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error submitting appeal:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
