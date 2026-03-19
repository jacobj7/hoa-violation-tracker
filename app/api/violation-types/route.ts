import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ViolationTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  default_fine: z.number().nonnegative("Default fine must be non-negative"),
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, description, default_fine, created_at, updated_at FROM violation_types ORDER BY name ASC",
      );
      return NextResponse.json(
        { violation_types: result.rows },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation types:", error);
    return NextResponse.json(
      { error: "Failed to fetch violation types" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = ViolationTypeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const { name, description, default_fine } = parseResult.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO violation_types (name, description, default_fine, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, name, description, default_fine, created_at, updated_at`,
        [name, description ?? null, default_fine],
      );
      return NextResponse.json(
        { violation_type: result.rows[0] },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Error creating violation type:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A violation type with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create violation type" },
      { status: 500 },
    );
  }
}
