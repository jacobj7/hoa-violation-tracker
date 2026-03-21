import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createViolationTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  code: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const severity = searchParams.get("severity") || "";
    const isActive = searchParams.get("is_active");

    const client = await pool.connect();

    try {
      let whereConditions: string[] = [];
      let queryParams: unknown[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(
          `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`,
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (severity) {
        whereConditions.push(`severity = $${paramIndex}`);
        queryParams.push(severity);
        paramIndex++;
      }

      if (isActive !== null && isActive !== undefined && isActive !== "") {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(isActive === "true");
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      const countQuery = `SELECT COUNT(*) FROM violation_types ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count, 10);

      const dataQuery = `
        SELECT 
          id,
          name,
          description,
          severity,
          code,
          is_active,
          created_at,
          updated_at
        FROM violation_types
        ${whereClause}
        ORDER BY name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await client.query(dataQuery, queryParams);

      return NextResponse.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation types:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const validationResult = createViolationTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, description, severity, code, is_active } =
      validationResult.data;

    const client = await pool.connect();

    try {
      if (code) {
        const existingCode = await client.query(
          "SELECT id FROM violation_types WHERE code = $1",
          [code],
        );

        if (existingCode.rows.length > 0) {
          return NextResponse.json(
            { error: "A violation type with this code already exists" },
            { status: 409 },
          );
        }
      }

      const existingName = await client.query(
        "SELECT id FROM violation_types WHERE name = $1",
        [name],
      );

      if (existingName.rows.length > 0) {
        return NextResponse.json(
          { error: "A violation type with this name already exists" },
          { status: 409 },
        );
      }

      const insertQuery = `
        INSERT INTO violation_types (name, description, severity, code, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, description, severity, code, is_active, created_at, updated_at
      `;

      const result = await client.query(insertQuery, [
        name,
        description || null,
        severity || null,
        code || null,
        is_active,
      ]);

      return NextResponse.json({ data: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating violation type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
