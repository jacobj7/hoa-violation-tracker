import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  points: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM violation_types ORDER BY name ASC",
    );
    return NextResponse.json({ violationTypes: result.rows });
  } catch (error) {
    console.error("Error fetching violation types:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createViolationTypeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, severity, points } = parseResult.data;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO violation_types (name, description, severity, points, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, description ?? null, severity ?? null, points ?? 0],
    );
    return NextResponse.json(
      { violationType: result.rows[0] },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error creating violation type:", error);
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Violation type with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
