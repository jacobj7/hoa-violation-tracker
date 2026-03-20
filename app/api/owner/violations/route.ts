import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  property_id: z.coerce.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      property_id: searchParams.get("property_id") ?? undefined,
    };

    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit, status, property_id } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["p.owner_id = $1"];
    const values: (string | number)[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`v.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (property_id) {
      conditions.push(`v.property_id = $${paramIndex}`);
      values.push(property_id);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      INNER JOIN properties p ON v.property_id = p.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.property_id,
        v.status,
        v.description,
        v.violation_type,
        v.severity,
        v.reported_at,
        v.resolved_at,
        v.created_at,
        v.updated_at,
        p.name as property_name,
        p.address as property_address,
        p.owner_id
      FROM violations v
      INNER JOIN properties p ON v.property_id = p.id
      ${whereClause}
      ORDER BY v.created_at DESC
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
    console.error("Error fetching owner violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
