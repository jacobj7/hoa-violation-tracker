import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const appealSchema = z.object({
  appeal_reason: z
    .string()
    .min(10, "Appeal reason must be at least 10 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const violationId = params.id;

  try {
    const body = await req.json();
    const parsed = appealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { appeal_reason } = parsed.data;

    const violationResult = await query(
      `SELECT * FROM violations WHERE id = $1`,
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    if (violation.status === "appealed" || violation.status === "resolved") {
      return NextResponse.json(
        { error: "Violation cannot be appealed in its current status" },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE violations
       SET status = 'appealed',
           appeal_reason = $1,
           appeal_submitted_at = NOW(),
           appeal_submitted_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [appeal_reason, session.user.email, violationId],
    );

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error("Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const violationId = params.id;

  const reviewSchema = z.object({
    appeal_status: z.enum(["approved", "denied"]),
    appeal_notes: z.string().optional(),
  });

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { appeal_status, appeal_notes } = parsed.data;

    const violationResult = await query(
      `SELECT * FROM violations WHERE id = $1`,
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    if (violation.status !== "appealed") {
      return NextResponse.json(
        { error: "Violation is not in appealed status" },
        { status: 400 },
      );
    }

    const newStatus = appeal_status === "approved" ? "resolved" : "open";

    const result = await query(
      `UPDATE violations
       SET status = $1,
           appeal_status = $2,
           appeal_notes = $3,
           appeal_reviewed_at = NOW(),
           appeal_reviewed_by = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        newStatus,
        appeal_status,
        appeal_notes ?? null,
        session.user.email,
        violationId,
      ],
    );

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error("Error reviewing appeal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
