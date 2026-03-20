import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const FineSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  currency: z.string().min(1).max(10).default("USD"),
  issued_by: z.string().min(1, "Issued by is required"),
  issued_at: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
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
    const parseResult = FineSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const { amount, currency, issued_by, issued_at, due_date, notes } =
      parseResult.data;

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

      const fineInsertResult = await client.query(
        `INSERT INTO fines (violation_id, amount, currency, issued_by, issued_at, due_date, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          violationId,
          amount,
          currency,
          issued_by,
          issued_at ? new Date(issued_at) : new Date(),
          due_date ? new Date(due_date) : null,
          notes || null,
        ],
      );

      await client.query(
        `UPDATE violations SET status = 'fined', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await client.query("COMMIT");

      const fine = fineInsertResult.rows[0];

      return NextResponse.json(
        {
          message: "Fine logged successfully",
          fine,
          violation: {
            id: violationId,
            status: "fined",
          },
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
    console.error("Error logging fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
