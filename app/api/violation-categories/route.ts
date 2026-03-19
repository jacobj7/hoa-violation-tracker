import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fine_amount: z.number().nonnegative(),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM violation_categories ORDER BY name ASC",
    );
    return NextResponse.json({ categories: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching violation categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch violation categories" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const parsed = CreateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, fine_amount } = parsed.data;

    const result = await client.query(
      `INSERT INTO violation_categories (name, description, fine_amount, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [name, description ?? null, fine_amount],
    );

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating violation category:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A violation category with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create violation category" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
