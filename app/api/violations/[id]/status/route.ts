import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const statusUpdateSchema = z.object({
  status: z.enum(["pending", "under_review", "resolved", "dismissed"]),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const parseResult = statusUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status, notes } = parseResult.data;

  try {
    const existingViolation = await query(
      "SELECT id FROM violations WHERE id = $1",
      [violationId],
    );

    if (existingViolation.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const updatedViolation = await query(
      `UPDATE violations 
       SET status = $1, 
           notes = COALESCE($2, notes), 
           updated_at = NOW(),
           reviewed_by = $3,
           reviewed_at = NOW()
       WHERE id = $4
       RETURNING id, status, notes, updated_at, reviewed_by, reviewed_at`,
      [status, notes ?? null, session.user.id, violationId],
    );

    await query(
      `INSERT INTO violation_audit_log (violation_id, changed_by, old_status, new_status, notes, created_at)
       SELECT $1, $2, v_old.status, $3, $4, NOW()
       FROM violations v_old WHERE v_old.id = $1`,
      [violationId, session.user.id, status, notes ?? null],
    );

    return NextResponse.json({
      message: "Violation status updated successfully",
      violation: updatedViolation.rows[0],
    });
  } catch (error) {
    console.error("Error updating violation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
