import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { limit, offset } = parseResult.data;

    const client = await pool.connect();

    try {
      const violationCountsByStatusQuery = `
        SELECT
          status,
          COUNT(*) AS count
        FROM violations
        GROUP BY status
        ORDER BY status ASC
      `;

      const recentViolationsQuery = `
        SELECT
          v.id,
          v.status,
          v.description,
          v.fine_amount,
          v.created_at,
          v.updated_at,
          u.name AS resident_name,
          u.email AS resident_email,
          p.address AS property_address
        FROM violations v
        LEFT JOIN users u ON v.user_id = u.id
        LEFT JOIN properties p ON v.property_id = p.id
        ORDER BY v.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const totalFinesOutstandingQuery = `
        SELECT
          COALESCE(SUM(fine_amount), 0) AS total_outstanding
        FROM violations
        WHERE status NOT IN ('paid', 'dismissed', 'resolved')
      `;

      const totalViolationsCountQuery = `
        SELECT COUNT(*) AS total
        FROM violations
      `;

      const [
        violationCountsByStatusResult,
        recentViolationsResult,
        totalFinesResult,
        totalViolationsResult,
      ] = await Promise.all([
        client.query(violationCountsByStatusQuery),
        client.query(recentViolationsQuery, [limit, offset]),
        client.query(totalFinesOutstandingQuery),
        client.query(totalViolationsCountQuery),
      ]);

      const violationCountsByStatus = violationCountsByStatusResult.rows.reduce(
        (
          acc: Record<string, number>,
          row: { status: string; count: string },
        ) => {
          acc[row.status] = parseInt(row.count, 10);
          return acc;
        },
        {},
      );

      const recentViolations = recentViolationsResult.rows.map((row) => ({
        id: row.id,
        status: row.status,
        description: row.description,
        fineAmount: row.fine_amount ? parseFloat(row.fine_amount) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        residentName: row.resident_name,
        residentEmail: row.resident_email,
        propertyAddress: row.property_address,
      }));

      const totalFinesOutstanding = parseFloat(
        totalFinesResult.rows[0]?.total_outstanding ?? "0",
      );

      const totalViolations = parseInt(
        totalViolationsResult.rows[0]?.total ?? "0",
        10,
      );

      return NextResponse.json({
        violationCountsByStatus,
        recentViolations,
        totalFinesOutstanding,
        pagination: {
          total: totalViolations,
          limit,
          offset,
          hasMore: offset + limit < totalViolations,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Dashboard board API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
