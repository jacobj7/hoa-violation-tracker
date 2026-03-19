import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const issueFineSchema = z.object({
  violation_id: z.number().int().positive(),
  user_id: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  due_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const payment_status = searchParams.get("payment_status");

    const client = await pool.connect();
    try {
      let query: string;
      let params: string[];

      if (payment_status) {
        query = `
          SELECT 
            f.id,
            f.violation_id,
            f.user_id,
            f.amount,
            f.description,
            f.payment_status,
            f.due_date,
            f.issued_at,
            f.paid_at,
            f.created_at,
            f.updated_at
          FROM fines f
          WHERE f.payment_status = $1
          ORDER BY f.created_at DESC
        `;
        params = [payment_status];
      } else {
        query = `
          SELECT 
            f.id,
            f.violation_id,
            f.user_id,
            f.amount,
            f.description,
            f.payment_status,
            f.due_date,
            f.issued_at,
            f.paid_at,
            f.created_at,
            f.updated_at
          FROM fines f
          ORDER BY f.created_at DESC
        `;
        params = [];
      }

      const result = await client.query(query, params);

      return NextResponse.json({
        fines: result.rows,
        total: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/fines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = issueFineSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { violation_id, user_id, amount, description, due_date } =
      parseResult.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const violationCheck = await client.query(
        "SELECT id FROM violations WHERE id = $1",
        [violation_id],
      );

      if (violationCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const insertQuery = `
        INSERT INTO fines (
          violation_id,
          user_id,
          amount,
          description,
          payment_status,
          due_date,
          issued_at,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, 'pending', $5, NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        violation_id,
        user_id,
        amount,
        description,
        due_date || null,
      ]);

      await client.query("COMMIT");

      return NextResponse.json({ fine: insertResult.rows[0] }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/fines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
