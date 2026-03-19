import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const appealSchema = z.object({
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
    const session = await getServerSession(authOptions);

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
    const parsed = appealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { reason } = parsed.data;

    const violationResult = await query(
      `SELECT id, user_id, status FROM violations WHERE id = $1`,
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    const isAdmin = session.user.role === "admin";
    if (!isAdmin && violation.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (violation.status === "appealed" || violation.status === "resolved") {
      return NextResponse.json(
        { error: "This violation has already been appealed or resolved" },
        { status: 409 },
      );
    }

    const existingAppeal = await query(
      `SELECT id FROM appeals WHERE violation_id = $1`,
      [violationId],
    );

    if (existingAppeal.rows.length > 0) {
      return NextResponse.json(
        { error: "An appeal already exists for this violation" },
        { status: 409 },
      );
    }

    await query("BEGIN", []);

    try {
      const appealResult = await query(
        `INSERT INTO appeals (violation_id, user_id, reason, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', NOW(), NOW())
         RETURNING id, violation_id, reason, status, created_at`,
        [violationId, session.user.id, reason],
      );

      await query(
        `UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await query("COMMIT", []);

      return NextResponse.json(
        {
          message: "Appeal submitted successfully",
          appeal: appealResult.rows[0],
        },
        { status: 201 },
      );
    } catch (innerError) {
      await query("ROLLBACK", []);
      throw innerError;
    }
  } catch (error) {
    console.error("Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

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

    const violationResult = await query(
      `SELECT id, user_id FROM violations WHERE id = $1`,
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];
    const isAdmin = session.user.role === "admin";

    if (!isAdmin && violation.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appealResult = await query(
      `SELECT a.id, a.violation_id, a.reason, a.status, a.created_at, a.updated_at,
              a.admin_response, a.reviewed_at
       FROM appeals a
       WHERE a.violation_id = $1
       ORDER BY a.created_at DESC`,
      [violationId],
    );

    return NextResponse.json({ appeals: appealResult.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching appeals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
