import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const appealSchema = z.object({
  reason: z.string().min(10, "Appeal reason must be at least 10 characters"),
  additional_info: z.string().optional(),
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

    if (!violationId || isNaN(Number(violationId))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = appealSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const { reason, additional_info } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        "SELECT id, status, user_id FROM violations WHERE id = $1",
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

      if (violation.status === "appealed") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "An appeal has already been submitted for this violation" },
          { status: 409 },
        );
      }

      if (violation.status === "resolved") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Cannot appeal a resolved violation" },
          { status: 400 },
        );
      }

      const userEmail = session.user.email;
      const userResult = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [userEmail],
      );

      let userId: number | null = null;
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      }

      const appealResult = await client.query(
        `INSERT INTO appeals (violation_id, user_id, reason, additional_info, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
         RETURNING id, violation_id, reason, additional_info, status, created_at`,
        [violationId, userId, reason, additional_info || null],
      );

      await client.query(
        "UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1",
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
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
