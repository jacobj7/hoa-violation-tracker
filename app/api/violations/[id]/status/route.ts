import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const statusSchema = z.object({
  status: z.enum(["pending", "under_review", "resolved", "dismissed"]),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "manager" && userRole !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Manager role required" },
      { status: 403 },
    );
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

  const parseResult = statusSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { status, notes } = parseResult.data;
  const userId = (session.user as { id?: string }).id ?? session.user.email;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violationResult = await client.query(
      "SELECT id, status FROM violations WHERE id = $1",
      [violationId],
    );

    if (violationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const previousStatus = violationResult.rows[0].status;

    const updateResult = await client.query(
      `UPDATE violations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, violationId],
    );

    await client.query(
      `INSERT INTO audit_log (
        entity_type,
        entity_id,
        action,
        performed_by,
        previous_value,
        new_value,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        "violation",
        violationId,
        "status_update",
        userId,
        previousStatus,
        status,
        notes ?? null,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Violation status updated successfully",
        violation: updateResult.rows[0],
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating violation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
