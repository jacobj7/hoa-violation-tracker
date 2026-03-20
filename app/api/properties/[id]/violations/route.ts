import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  status: z
    .enum(["open", "closed", "pending", "all"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = params.id;
    if (!propertyId || isNaN(Number(propertyId))) {
      return NextResponse.json(
        { error: "Invalid property ID" },
        { status: 400 },
      );
    }

    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );
    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      // Verify property exists
      const propertyResult = await client.query(
        "SELECT id, address, owner_name FROM properties WHERE id = $1",
        [propertyId],
      );

      if (propertyResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 },
        );
      }

      const property = propertyResult.rows[0];

      // Build violations query with optional status filter
      let violationsQuery = `
        SELECT
          v.id,
          v.property_id,
          v.violation_type,
          v.description,
          v.status,
          v.fine_amount,
          v.amount_paid,
          (v.fine_amount - COALESCE(v.amount_paid, 0)) AS balance_due,
          v.issued_date,
          v.due_date,
          v.resolved_date,
          v.inspector_name,
          v.notes,
          v.created_at,
          v.updated_at
        FROM violations v
        WHERE v.property_id = $1
      `;

      const queryParams: (string | number)[] = [propertyId];
      let paramIndex = 2;

      if (status !== "all") {
        violationsQuery += ` AND v.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      violationsQuery += ` ORDER BY v.issued_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const violationsResult = await client.query(violationsQuery, queryParams);

      // Count total violations for pagination
      let countQuery = `
        SELECT COUNT(*) AS total
        FROM violations v
        WHERE v.property_id = $1
      `;
      const countParams: (string | number)[] = [propertyId];

      if (status !== "all") {
        countQuery += " AND v.status = $2";
        countParams.push(status);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      // Get fine balance summary
      const summaryResult = await client.query(
        `
        SELECT
          COUNT(*) AS total_violations,
          COUNT(*) FILTER (WHERE status = 'open') AS open_violations,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed_violations,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_violations,
          COALESCE(SUM(fine_amount), 0) AS total_fines,
          COALESCE(SUM(amount_paid), 0) AS total_paid,
          COALESCE(SUM(fine_amount - COALESCE(amount_paid, 0)), 0) AS total_balance_due,
          COALESCE(SUM(fine_amount) FILTER (WHERE status = 'open'), 0) AS open_fines_total,
          COALESCE(SUM(fine_amount - COALESCE(amount_paid, 0)) FILTER (WHERE status = 'open'), 0) AS open_balance_due
        FROM violations
        WHERE property_id = $1
        `,
        [propertyId],
      );

      const summary = summaryResult.rows[0];

      return NextResponse.json({
        property: {
          id: property.id,
          address: property.address,
          owner_name: property.owner_name,
        },
        violations: violationsResult.rows,
        summary: {
          total_violations: parseInt(summary.total_violations, 10),
          open_violations: parseInt(summary.open_violations, 10),
          closed_violations: parseInt(summary.closed_violations, 10),
          pending_violations: parseInt(summary.pending_violations, 10),
          total_fines: parseFloat(summary.total_fines),
          total_paid: parseFloat(summary.total_paid),
          total_balance_due: parseFloat(summary.total_balance_due),
          open_fines_total: parseFloat(summary.open_fines_total),
          open_balance_due: parseFloat(summary.open_balance_due),
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: page * limit < total,
          has_prev: page > 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching property violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
