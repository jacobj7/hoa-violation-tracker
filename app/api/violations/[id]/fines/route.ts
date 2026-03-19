import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const fineSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1).max(10).default("USD"),
  reason: z.string().min(1, "Reason is required"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
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

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Manager access required" },
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

    const body = await request.json();
    const validationResult = fineSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { amount, currency, reason, due_date, notes } = validationResult.data;

    const client = await pool.connect();
    try {
      const violationCheck = await client.query(
        "SELECT id FROM violations WHERE id = $1",
        [violationId],
      );

      if (violationCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const issuedBy =
        (session.user as { id?: string }).id || session.user.email;

      const result = await client.query(
        `INSERT INTO fines (
          violation_id,
          amount,
          currency,
          reason,
          due_date,
          notes,
          issued_by,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
        RETURNING *`,
        [
          violationId,
          amount,
          currency,
          reason,
          due_date || null,
          notes || null,
          issuedBy,
        ],
      );

      const fine = result.rows[0];

      await client.query(
        `UPDATE violations SET updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      return NextResponse.json(
        {
          message: "Fine issued successfully",
          fine,
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error issuing fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
