import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id?: string }).id;

    const propertiesResult = await query(
      `SELECT COUNT(*) as count FROM properties WHERE user_id = $1`,
      [userId],
    );

    const violationsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'appealed' THEN 1 END) as appealed_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      WHERE p.user_id = $1`,
      [userId],
    );

    const recentViolationsResult = await query(
      `SELECT 
        v.id,
        v.title,
        v.status,
        v.severity,
        v.created_at,
        p.address as property_address
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      WHERE p.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT 5`,
      [userId],
    );

    const finesSummaryResult = await query(
      `SELECT 
        COALESCE(SUM(fine_amount), 0) as total_fines,
        COALESCE(SUM(CASE WHEN fine_paid = false AND fine_amount IS NOT NULL THEN fine_amount ELSE 0 END), 0) as unpaid_fines,
        COALESCE(SUM(CASE WHEN fine_paid = true THEN fine_amount ELSE 0 END), 0) as paid_fines
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      WHERE p.user_id = $1`,
      [userId],
    );

    const violationsByCategoryResult = await query(
      `SELECT 
        vc.name as category,
        COUNT(v.id) as count
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      JOIN violation_categories vc ON v.category_id = vc.id
      WHERE p.user_id = $1
      GROUP BY vc.name
      ORDER BY count DESC
      LIMIT 5`,
      [userId],
    );

    const summary = {
      properties: {
        total: parseInt(propertiesResult.rows[0]?.count || "0"),
      },
      violations: {
        total: parseInt(violationsResult.rows[0]?.total || "0"),
        open: parseInt(violationsResult.rows[0]?.open_count || "0"),
        resolved: parseInt(violationsResult.rows[0]?.resolved_count || "0"),
        appealed: parseInt(violationsResult.rows[0]?.appealed_count || "0"),
        closed: parseInt(violationsResult.rows[0]?.closed_count || "0"),
      },
      fines: {
        total: parseFloat(finesSummaryResult.rows[0]?.total_fines || "0"),
        unpaid: parseFloat(finesSummaryResult.rows[0]?.unpaid_fines || "0"),
        paid: parseFloat(finesSummaryResult.rows[0]?.paid_fines || "0"),
      },
      recentViolations: recentViolationsResult.rows,
      violationsByCategory: violationsByCategoryResult.rows,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
