import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const appealSchema = z.object({
  appeal_reason: z.string().min(1),
  owner_email: z.string().email(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const body = await request.json();
    const parsed = appealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { appeal_reason, owner_email } = parsed.data;

    // Verify the violation exists and belongs to this owner
    const violationResult = await db.query(
      `SELECT v.*, p.owner_email as property_owner_email
       FROM violations v
       JOIN properties p ON v.property_id = p.id
       WHERE v.id = $1`,
      [id],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    if (violation.property_owner_email !== owner_email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (violation.status !== "open") {
      return NextResponse.json(
        { error: "Violation cannot be appealed in its current status" },
        { status: 400 },
      );
    }

    const result = await db.query(
      `UPDATE violations
       SET status = 'appealed', appeal_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [appeal_reason, id],
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
