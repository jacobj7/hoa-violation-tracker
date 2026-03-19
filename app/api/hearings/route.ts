import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "From date must be in YYYY-MM-DD format")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "To date must be in YYYY-MM-DD format")
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n > 0 && n <= 500, "Limit must be between 1 and 500")
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 0, "Offset must be non-negative")
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parseResult = querySchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { date, from, to, limit = 100, offset = 0 } = parseResult.data;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (date) {
      conditions.push(`DATE(hearing_date) = $${paramIndex}`);
      values.push(date);
      paramIndex++;
    } else {
      if (from) {
        conditions.push(`DATE(hearing_date) >= $${paramIndex}`);
        values.push(from);
        paramIndex++;
      }
      if (to) {
        conditions.push(`DATE(hearing_date) <= $${paramIndex}`);
        values.push(to);
        paramIndex++;
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) AS total FROM hearings ${whereClause}`;
    const dataQuery = `
      SELECT
        id,
        title,
        description,
        hearing_date,
        location,
        committee,
        status,
        created_at,
        updated_at
      FROM hearings
      ${whereClause}
      ORDER BY hearing_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countValues = [...values];
    const dataValues = [...values, limit, offset];

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const hearings = dataResult.rows;

      return NextResponse.json(
        {
          data: hearings,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + hearings.length < total,
          },
          filters: {
            date: date ?? null,
            from: from ?? null,
            to: to ?? null,
          },
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching hearings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
