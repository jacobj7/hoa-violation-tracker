import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();

    try {
      const [
        totalViolationsResult,
        openViolationsResult,
        pendingFinesResult,
        upcomingHearingsResult,
      ] = await Promise.all([
        client.query("SELECT COUNT(*) AS count FROM violations"),
        client.query(
          "SELECT COUNT(*) AS count FROM violations WHERE status = 'open'",
        ),
        client.query(
          "SELECT COUNT(*) AS count FROM fines WHERE status = 'pending'",
        ),
        client.query(
          "SELECT COUNT(*) AS count FROM hearings WHERE hearing_date >= NOW() AND status != 'cancelled'",
        ),
      ]);

      const summary = {
        totalViolations: parseInt(totalViolationsResult.rows[0].count, 10),
        openViolations: parseInt(openViolationsResult.rows[0].count, 10),
        pendingFines: parseInt(pendingFinesResult.rows[0].count, 10),
        upcomingHearings: parseInt(upcomingHearingsResult.rows[0].count, 10),
      };

      return NextResponse.json(summary);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
