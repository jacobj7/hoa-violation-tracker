import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const violationsByStatusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM violations
      GROUP BY status
      ORDER BY status
    `);

    const totalFinesResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as total_fines_amount
      FROM fines
    `);

    const outstandingFinesResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as outstanding_fines
      FROM fines
      WHERE status = 'outstanding' OR status = 'unpaid' OR status = 'pending'
    `);

    const propertiesWithOpenViolationsResult = await client.query(`
      SELECT COUNT(DISTINCT property_id) as properties_with_open_violations
      FROM violations
      WHERE status NOT IN ('closed', 'resolved', 'dismissed')
    `);

    const violationsByStatus: Record<string, number> = {};
    for (const row of violationsByStatusResult.rows) {
      violationsByStatus[row.status] = parseInt(row.count, 10);
    }

    const totalViolations = violationsByStatusResult.rows.reduce(
      (sum: number, row: { count: string }) => sum + parseInt(row.count, 10),
      0,
    );

    return NextResponse.json({
      violations_by_status: violationsByStatus,
      total_violations: totalViolations,
      total_fines_amount: parseFloat(
        totalFinesResult.rows[0].total_fines_amount,
      ),
      outstanding_fines: parseFloat(
        outstandingFinesResult.rows[0].outstanding_fines,
      ),
      properties_with_open_violations: parseInt(
        propertiesWithOpenViolationsResult.rows[0]
          .properties_with_open_violations,
        10,
      ),
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard summary" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
