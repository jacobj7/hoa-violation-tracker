import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const noticeSchema = z.object({
  notice_type: z.string().min(1, "Notice type is required"),
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_email: z.string().email("Valid email is required"),
  recipient_address: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  sent_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
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
    const validationResult = noticeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const {
      notice_type,
      recipient_name,
      recipient_email,
      recipient_address,
      message,
      sent_at,
      metadata,
    } = validationResult.data;

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

      const noticeInsertResult = await client.query(
        `INSERT INTO notices (
          violation_id,
          notice_type,
          recipient_name,
          recipient_email,
          recipient_address,
          message,
          sent_at,
          metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          violationId,
          notice_type,
          recipient_name,
          recipient_email,
          recipient_address || null,
          message,
          sent_at ? new Date(sent_at) : new Date(),
          metadata ? JSON.stringify(metadata) : null,
        ],
      );

      await client.query(
        `UPDATE violations
         SET status = 'notified', updated_at = NOW()
         WHERE id = $1`,
        [violationId],
      );

      await client.query("COMMIT");

      const notice = noticeInsertResult.rows[0];

      return NextResponse.json(
        {
          success: true,
          notice,
          message: "Notice logged and violation status updated to notified",
        },
        { status: 201 },
      );
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error logging notice:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
