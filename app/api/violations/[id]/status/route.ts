import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const statusUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "dismissed", "closed"]),
  reason: z.string().optional(),
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

    if (!violationId) {
      return NextResponse.json(
        { error: "Violation ID is required" },
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

    const { status, reason, notes } = parseResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationCheck = await client.query(
        "SELECT id, status FROM violations WHERE id = $1",
        [violationId],
      );

      if (violationCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const previousStatus = violationCheck.rows[0].status;

      const updateResult = await client.query(
        `UPDATE violations
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, status, updated_at`,
        [status, violationId],
      );

      const updatedViolation = updateResult.rows[0];

      await client.query(
        `INSERT INTO audit_events (
           entity_type,
           entity_id,
           action,
           actor_email,
           actor_id,
           previous_value,
           new_value,
           metadata,
           created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          "violation",
          violationId,
          "status_update",
          session.user.email ?? null,
          (session.user as { id?: string }).id ?? null,
          JSON.stringify({ status: previousStatus }),
          JSON.stringify({ status }),
          JSON.stringify({
            reason: reason ?? null,
            notes: notes ?? null,
            updated_by: session.user.email ?? null,
          }),
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          violation: {
            id: updatedViolation.id,
            status: updatedViolation.status,
            updated_at: updatedViolation.updated_at,
          },
          audit: {
            action: "status_update",
            previous_status: previousStatus,
            new_status: status,
          },
        },
        { status: 200 },
      );
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating violation status:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
