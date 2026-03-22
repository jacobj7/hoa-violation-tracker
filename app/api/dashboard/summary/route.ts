import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [violationsByStatus, totalProperties, violationsThisMonth] =
      await Promise.all([
        query(
          `SELECT status, COUNT(*) as count
           FROM violations
           GROUP BY status
           ORDER BY status`,
        ),
        query(`SELECT COUNT(*) as count FROM properties`),
        query(
          `SELECT COUNT(*) as count
           FROM violations
           WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
        ),
      ]);

    const violationCountsByStatus: Record<string, number> = {};
    for (const row of violationsByStatus.rows) {
      violationCountsByStatus[row.status] = parseInt(row.count, 10);
    }

    return NextResponse.json({
      violationCountsByStatus,
      totalProperties: parseInt(totalProperties.rows[0]?.count ?? "0", 10),
      violationsThisMonth: parseInt(
        violationsThisMonth.rows[0]?.count ?? "0",
        10,
      ),
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
