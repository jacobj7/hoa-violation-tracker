import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import ViolationsClient from "./ViolationsClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Violation {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  category: string;
  location: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

async function getViolations(): Promise<Violation[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<Violation>(`
      SELECT
        id,
        title,
        description,
        severity,
        status,
        category,
        location,
        reported_by,
        assigned_to,
        created_at,
        updated_at,
        resolved_at
      FROM violations
      ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("Error fetching violations:", error);
    return [];
  } finally {
    client.release();
  }
}

async function getViolationStats() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
        COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
        COUNT(*) AS total_count
      FROM violations
    `);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching violation stats:", error);
    return {
      open_count: 0,
      in_progress_count: 0,
      resolved_count: 0,
      closed_count: 0,
      critical_count: 0,
      high_count: 0,
      total_count: 0,
    };
  } finally {
    client.release();
  }
}

export default async function ViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [violations, stats] = await Promise.all([
    getViolations(),
    getViolationStats(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Violations</h1>
        <p className="mt-2 text-gray-600">
          Monitor and manage compliance violations across your organization.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.total_count}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Open</p>
          <p className="text-2xl font-bold text-red-600">{stats.open_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.in_progress_count}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.resolved_count}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Critical</p>
          <p className="text-2xl font-bold text-red-800">
            {stats.critical_count}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">High</p>
          <p className="text-2xl font-bold text-orange-600">
            {stats.high_count}
          </p>
        </div>
      </div>

      <ViolationsClient violations={violations} />
    </div>
  );
}
