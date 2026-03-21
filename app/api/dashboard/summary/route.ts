import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const allowedRoles = ["manager", "admin"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await pool.connect();

    try {
      const [
        violationsByStatusResult,
        totalFinesResult,
        overdueViolationsResult,
        violationsByTypeResult,
      ] = await Promise.all([
        client.query(`
          SELECT 
            status,
            COUNT(*) as count
          FROM violations
          GROUP BY status
          ORDER BY status
        `),

        client.query(`
          SELECT 
            COALESCE(SUM(fine_amount), 0) as total_fines,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN fine_amount ELSE 0 END), 0) as paid_fines,
            COALESCE(SUM(CASE WHEN status != 'paid' THEN fine_amount ELSE 0 END), 0) as unpaid_fines
          FROM violations
        `),

        client.query(`
          SELECT 
            v.id,
            v.violation_type,
            v.status,
            v.fine_amount,
            v.due_date,
            v.created_at,
            v.description,
            u.name as user_name,
            u.email as user_email
          FROM violations v
          LEFT JOIN users u ON v.user_id = u.id
          WHERE v.status NOT IN ('paid', 'dismissed')
            AND v.due_date < NOW()
          ORDER BY v.due_date ASC
          LIMIT 50
        `),

        client.query(`
          SELECT 
            violation_type,
            COUNT(*) as count,
            COALESCE(SUM(fine_amount), 0) as total_fines
          FROM violations
          GROUP BY violation_type
          ORDER BY count DESC
        `),
      ]);

      const violationsByStatus = violationsByStatusResult.rows.reduce(
        (
          acc: Record<string, number>,
          row: { status: string; count: string },
        ) => {
          acc[row.status] = parseInt(row.count, 10);
          return acc;
        },
        {},
      );

      const finesData = totalFinesResult.rows[0];
      const totalFines = {
        total: parseFloat(finesData.total_fines),
        paid: parseFloat(finesData.paid_fines),
        unpaid: parseFloat(finesData.unpaid_fines),
      };

      const overdueViolations = overdueViolationsResult.rows.map((row) => ({
        id: row.id,
        violationType: row.violation_type,
        status: row.status,
        fineAmount: parseFloat(row.fine_amount || 0),
        dueDate: row.due_date,
        createdAt: row.created_at,
        description: row.description,
        user: {
          name: row.user_name,
          email: row.user_email,
        },
      }));

      const violationsByType = violationsByTypeResult.rows.map((row) => ({
        type: row.violation_type,
        count: parseInt(row.count, 10),
        totalFines: parseFloat(row.total_fines),
      }));

      const totalViolations = Object.values(violationsByStatus).reduce(
        (sum, count) => sum + count,
        0,
      );

      return NextResponse.json({
        summary: {
          totalViolations,
          violationsByStatus,
          totalFines,
          overdueViolations,
          violationsByType,
          overdueCount: overdueViolations.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
