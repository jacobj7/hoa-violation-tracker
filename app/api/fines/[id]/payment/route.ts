import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paymentSchema = z.object({
  payment_date: z.string().datetime().optional(),
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

    const fineId = params.id;

    if (!fineId || isNaN(Number(fineId))) {
      return NextResponse.json({ error: "Invalid fine ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const paymentDate = parsed.data.payment_date
      ? new Date(parsed.data.payment_date)
      : new Date();

    const client = await pool.connect();

    try {
      const checkResult = await client.query(
        "SELECT id, status FROM fines WHERE id = $1",
        [fineId],
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json({ error: "Fine not found" }, { status: 404 });
      }

      const fine = checkResult.rows[0];

      if (fine.status === "paid") {
        return NextResponse.json(
          { error: "Fine is already marked as paid" },
          { status: 409 },
        );
      }

      const updateResult = await client.query(
        `UPDATE fines
         SET status = 'paid', payment_date = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [paymentDate, fineId],
      );

      const updatedFine = updateResult.rows[0];

      return NextResponse.json(
        {
          message: "Fine marked as paid successfully",
          fine: updatedFine,
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error processing payment for fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
