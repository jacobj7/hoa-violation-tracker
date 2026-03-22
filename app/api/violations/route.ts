import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const postViolationSchema = z.object({
  property_id: z.number().int().positive(),
  violation_type_id: z.number().int().positive(),
  description: z.string().min(1).max(5000),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const property_id = searchParams.get("property_id");
  const inspector_id = searchParams.get("inspector_id");

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`v.status = $${paramIndex++}`);
    values.push(status);
  }

  if (property_id) {
    const pid = parseInt(property_id, 10);
    if (!isNaN(pid)) {
      conditions.push(`v.property_id = $${paramIndex++}`);
      values.push(pid);
    }
  }

  if (inspector_id) {
    const iid = parseInt(inspector_id, 10);
    if (!isNaN(iid)) {
      conditions.push(`v.inspector_id = $${paramIndex++}`);
      values.push(iid);
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      v.id,
      v.property_id,
      v.violation_type_id,
      v.inspector_id,
      v.description,
      v.status,
      v.created_at,
      v.updated_at,
      p.address AS property_address,
      vt.name AS violation_type_name
    FROM violations v
    LEFT JOIN properties p ON p.id = v.property_id
    LEFT JOIN violation_types vt ON vt.id = v.violation_type_id
    ${whereClause}
    ORDER BY v.created_at DESC
  `;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json({ violations: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = postViolationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { property_id, violation_type_id, description } = parseResult.data;

  const userEmail = session.user.email;
  let inspectorId: number | null = null;

  try {
    const client = await pool.connect();
    try {
      if (userEmail) {
        const userResult = await client.query(
          "SELECT id FROM users WHERE email = $1 LIMIT 1",
          [userEmail],
        );
        if (userResult.rows.length > 0) {
          inspectorId = userResult.rows[0].id;
        }
      }

      const insertResult = await client.query(
        `INSERT INTO violations (property_id, violation_type_id, inspector_id, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'open', NOW(), NOW())
         RETURNING *`,
        [property_id, violation_type_id, inspectorId, description],
      );

      return NextResponse.json(
        { violation: insertResult.rows[0] },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
