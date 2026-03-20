import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const scheduleHearingSchema = z.object({
  action: z.literal("schedule"),
  scheduled_at: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const recordOutcomeSchema = z.object({
  action: z.literal("outcome"),
  outcome: z.enum(["upheld", "dismissed", "reduced", "deferred", "pending"]),
  notes: z.string().optional(),
  fine_amount: z.number().optional(),
  resolution_date: z.string().datetime().optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  scheduleHearingSchema,
  recordOutcomeSchema,
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = requestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const data = parseResult.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify violation exists
    const violationResult = await client.query(
      "SELECT id, status FROM violations WHERE id = $1",
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    let hearing: Record<string, unknown>;
    let newViolationStatus: string;

    if (data.action === "schedule") {
      // Check if a hearing already exists for this violation
      const existingHearing = await client.query(
        "SELECT id FROM hearings WHERE violation_id = $1",
        [violationId],
      );

      if (existingHearing.rows.length > 0) {
        // Update existing hearing
        const updateResult = await client.query(
          `UPDATE hearings
           SET scheduled_at = $1,
               location = $2,
               notes = $3,
               updated_at = NOW()
           WHERE violation_id = $4
           RETURNING *`,
          [
            data.scheduled_at,
            data.location ?? null,
            data.notes ?? null,
            violationId,
          ],
        );
        hearing = updateResult.rows[0];
      } else {
        // Insert new hearing
        const insertResult = await client.query(
          `INSERT INTO hearings (violation_id, scheduled_at, location, notes, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'scheduled', NOW(), NOW())
           RETURNING *`,
          [
            violationId,
            data.scheduled_at,
            data.location ?? null,
            data.notes ?? null,
          ],
        );
        hearing = insertResult.rows[0];
      }

      newViolationStatus = "hearing_scheduled";

      await client.query(
        `UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newViolationStatus, violationId],
      );
    } else {
      // Record outcome
      const existingHearing = await client.query(
        "SELECT id FROM hearings WHERE violation_id = $1",
        [violationId],
      );

      const resolutionDate = data.resolution_date ?? new Date().toISOString();

      if (existingHearing.rows.length > 0) {
        const updateResult = await client.query(
          `UPDATE hearings
           SET outcome = $1,
               notes = COALESCE($2, notes),
               fine_amount = $3,
               resolution_date = $4,
               status = 'completed',
               updated_at = NOW()
           WHERE violation_id = $5
           RETURNING *`,
          [
            data.outcome,
            data.notes ?? null,
            data.fine_amount ?? null,
            resolutionDate,
            violationId,
          ],
        );
        hearing = updateResult.rows[0];
      } else {
        const insertResult = await client.query(
          `INSERT INTO hearings (violation_id, outcome, notes, fine_amount, resolution_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW())
           RETURNING *`,
          [
            violationId,
            data.outcome,
            data.notes ?? null,
            data.fine_amount ?? null,
            resolutionDate,
          ],
        );
        hearing = insertResult.rows[0];
      }

      // Map outcome to violation status
      const outcomeStatusMap: Record<string, string> = {
        upheld: "upheld",
        dismissed: "dismissed",
        reduced: "reduced",
        deferred: "deferred",
        pending: "hearing_pending",
      };

      newViolationStatus = outcomeStatusMap[data.outcome] ?? "resolved";

      await client.query(
        `UPDATE violations SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newViolationStatus, violationId],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        hearing,
        violation_status: newViolationStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing hearing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
