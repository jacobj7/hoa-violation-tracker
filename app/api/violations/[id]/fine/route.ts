import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createFineSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "due_date must be a valid date string",
  }),
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

    if (!violationId) {
      return NextResponse.json(
        { error: "Violation ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const parseResult = createFineSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { amount, due_date } = parseResult.data;

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

      const result = await client.query(
        `INSERT INTO fines (amount, due_date, violation_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [amount, due_date, violationId],
      );

      const fine = result.rows[0];

      return NextResponse.json(
        {
          message: "Fine created successfully",
          fine,
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating fine:", error);

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
