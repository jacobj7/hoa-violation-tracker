import { Suspense } from "react";
import ViolationsClient from "./ViolationsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getViolations(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        v.id,
        v.title,
        v.description,
        v.severity,
        v.status,
        v.created_at,
        v.updated_at,
        v.location,
        v.category,
        v.reporter_id,
        u.name as reporter_name,
        u.email as reporter_email
      FROM violations v
      LEFT JOIN users u ON v.reporter_id = u.id
      ORDER BY v.created_at DESC`,
      [],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getViolationStats(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'high') as high_count,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
        COUNT(*) FILTER (WHERE severity = 'low') as low_count
      FROM violations`,
      [],
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export default async function ViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const [violations, stats] = await Promise.all([
    getViolations(session.user.id as string),
    getViolationStats(session.user.id as string),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Violations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor and manage all reported violations across your organization.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <ViolationsClient
            initialViolations={violations}
            stats={stats}
            currentUserId={session.user.id as string}
          />
        </Suspense>
      </div>
    </div>
  );
}
