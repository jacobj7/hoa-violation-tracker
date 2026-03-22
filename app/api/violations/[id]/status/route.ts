import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusTransitions: Record<string, string[]> = {
  reported: ["under_review"],
  under_review: ["resolved", "dismissed", "reported"],
  resolved: [],
  dismissed: [],
};

const managerOnlyTransitions: Record<string, string[]> = {
  under_review: ["resolved", "dismissed"],
};

const updateStatusSchema = z.object({
  status: z.enum(["reported", "under_review", "resolved", "dismissed"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json();
    const parseResult = updateStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { status: newStatus, notes } = parseResult.data;

    const violationResult = await query(
      "SELECT * FROM violations WHERE id = $1",
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];
    const currentStatus = violation.status;

    const allowedTransitions = statusTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          allowedTransitions,
        },
        { status: 422 },
      );
    }

    const managerRequired =
      managerOnlyTransitions[currentStatus]?.includes(newStatus);
    const userRole = (session.user as { role?: string }).role;

    if (managerRequired && userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        {
          error: `Transition to '${newStatus}' requires manager or admin role`,
        },
        { status: 403 },
      );
    }

    const userId = (session.user as { id?: string | number }).id;

    const updateResult = await query(
      `UPDATE violations
       SET status = $1,
           updated_at = NOW(),
           updated_by = $2
           ${notes !== undefined ? ", notes = $4" : ""}
       WHERE id = $3
       RETURNING *`,
      notes !== undefined
        ? [newStatus, userId, violationId, notes]
        : [newStatus, userId, violationId],
    );

    const updatedViolation = updateResult.rows[0];

    await query(
      `INSERT INTO violation_status_history (violation_id, old_status, new_status, changed_by, changed_at, notes)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [violationId, currentStatus, newStatus, userId, notes || null],
    ).catch(() => {
      // History table may not exist, ignore error
    });

    return NextResponse.json(
      {
        message: "Violation status updated successfully",
        violation: updatedViolation,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating violation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
