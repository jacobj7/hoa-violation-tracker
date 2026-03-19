import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import DashboardClient from "./DashboardClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getViolationCountsByStatus() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM violations
      GROUP BY status
      ORDER BY status
    `);

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  } finally {
    client.release();
  }
}

async function getTotalViolations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT COUNT(*) as total FROM violations
    `);
    return parseInt(result.rows[0]?.total ?? "0", 10);
  } finally {
    client.release();
  }
}

async function getRecentViolations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        id,
        title,
        status,
        severity,
        created_at,
        updated_at
      FROM violations
      ORDER BY created_at DESC
      LIMIT 5
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "manager" && userRole !== "admin") {
    redirect("/unauthorized");
  }

  const [violationCountsByStatus, totalViolations, recentViolations] =
    await Promise.all([
      getViolationCountsByStatus(),
      getTotalViolations(),
      getRecentViolations(),
    ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>

        <DashboardClient
          violationCountsByStatus={violationCountsByStatus}
          totalViolations={totalViolations}
          recentViolations={recentViolations}
          userEmail={session.user.email ?? ""}
          userName={session.user.name ?? ""}
        />
      </div>
    </div>
  );
}
