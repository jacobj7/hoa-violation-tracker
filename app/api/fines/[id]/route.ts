import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const updateFineSchema = z.object({
  status: z.enum(["pending", "paid", "waived"]),
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

    const body = await request.json();

    const validationResult = updateFineSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status } = validationResult.data;

    const client = await pool.connect();

    try {
      const checkResult = await client.query(
        "SELECT id, status FROM fines WHERE id = $1",
        [fineId],
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json({ error: "Fine not found" }, { status: 404 });
      }

      const updateResult = await client.query(
        `UPDATE fines 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, status, amount, user_id, reason, created_at, updated_at`,
        [status, fineId],
      );

      const updatedFine = updateResult.rows[0];

      return NextResponse.json(
        {
          message: "Fine status updated successfully",
          fine: updatedFine,
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
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

    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT id, status, amount, user_id, reason, created_at, updated_at 
         FROM fines 
         WHERE id = $1`,
        [fineId],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Fine not found" }, { status: 404 });
      }

      return NextResponse.json({ fine: result.rows[0] }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching fine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
