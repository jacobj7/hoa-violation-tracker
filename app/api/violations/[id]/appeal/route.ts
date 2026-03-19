import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const appealSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(5000),
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = appealSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const { reason } = parseResult.data;
    const userId = (session.user as { id?: string }).id || session.user.email;

    const client = await pool.connect();
    try {
      // Fetch the violation and verify ownership
      const violationResult = await client.query(
        `SELECT v.id, v.status, v.property_id, p.owner_id
         FROM violations v
         JOIN properties p ON v.property_id = p.id
         WHERE v.id = $1`,
        [violationId],
      );

      if (violationResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violation = violationResult.rows[0];

      // Check that the current user owns the property
      if (String(violation.owner_id) !== String(userId)) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this property" },
          { status: 403 },
        );
      }

      // Check if an appeal already exists for this violation
      const existingAppeal = await client.query(
        `SELECT id FROM appeals WHERE violation_id = $1`,
        [violationId],
      );

      if (existingAppeal.rows.length > 0) {
        return NextResponse.json(
          { error: "An appeal has already been submitted for this violation" },
          { status: 409 },
        );
      }

      // Insert the appeal
      const insertResult = await client.query(
        `INSERT INTO appeals (violation_id, submitted_by, reason, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', NOW(), NOW())
         RETURNING id, violation_id, submitted_by, reason, status, created_at, updated_at`,
        [violationId, userId, reason],
      );

      const appeal = insertResult.rows[0];

      // Optionally update the violation status to 'appealed'
      await client.query(
        `UPDATE violations SET status = 'appealed', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      return NextResponse.json(
        {
          message: "Appeal submitted successfully",
          appeal,
        },
        { status: 201 },
      );
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
