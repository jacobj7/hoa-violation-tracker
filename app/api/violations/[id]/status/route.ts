import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const statusUpdateSchema = z.object({
  status: z.enum(["pending", "under_review", "resolved", "dismissed"]),
  notes: z.string().optional(),
});

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

    if (!violationId || isNaN(Number(violationId))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const parseResult = statusUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status, notes } = parseResult.data;

    const client = await pool.connect();

    try {
      const checkResult = await client.query(
        "SELECT id, status FROM violations WHERE id = $1",
        [violationId],
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const updateResult = await client.query(
        `UPDATE violations
         SET status = $1,
             notes = COALESCE($2, notes),
             updated_at = NOW(),
             updated_by = $3
         WHERE id = $4
         RETURNING id, status, notes, updated_at, updated_by`,
        [
          status,
          notes ?? null,
          session.user.email ?? session.user.name,
          violationId,
        ],
      );

      const updatedViolation = updateResult.rows[0];

      await client.query(
        `INSERT INTO violation_status_history (violation_id, status, changed_by, changed_at, notes)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [
          violationId,
          status,
          session.user.email ?? session.user.name,
          notes ?? null,
        ],
      );

      return NextResponse.json(
        {
          message: "Violation status updated successfully",
          violation: updatedViolation,
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating violation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
