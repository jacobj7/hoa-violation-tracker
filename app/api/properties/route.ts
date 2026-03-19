import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  q: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      address: searchParams.get("address") ?? undefined,
      unit: searchParams.get("unit") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { q, address, unit, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(
        `(p.address ILIKE $${paramIndex} OR p.unit_number ILIKE $${paramIndex + 1})`,
      );
      values.push(`%${q}%`, `%${q}%`);
      paramIndex += 2;
    }

    if (address) {
      conditions.push(`p.address ILIKE $${paramIndex}`);
      values.push(`%${address}%`);
      paramIndex += 1;
    }

    if (unit) {
      conditions.push(`p.unit_number ILIKE $${paramIndex}`);
      values.push(`%${unit}%`);
      paramIndex += 1;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM properties p
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        p.id,
        p.address,
        p.unit_number,
        p.city,
        p.state,
        p.zip_code,
        p.property_type,
        p.bedrooms,
        p.bathrooms,
        p.square_feet,
        p.rent_amount,
        p.status,
        p.created_at,
        p.updated_at
      FROM properties p
      ${whereClause}
      ORDER BY p.created_at DESC
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

      const total = parseInt(countResult.rows[0]?.total ?? "0", 10);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
