import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

async function getViolations(status?: string) {
  const client = await db.connect();
  try {
    let query = `
      SELECT 
        v.id,
        v.status,
        v.description,
        v.created_at,
        v.updated_at,
        v.location,
        v.severity,
        u.name as reporter_name,
        u.email as reporter_email,
        a.name as assignee_name
      FROM violations v
      LEFT JOIN users u ON v.reporter_id = u.id
      LEFT JOIN users a ON v.assignee_id = a.id
    `;
    const params: string[] = [];

    if (status && status !== "all") {
      query += ` WHERE v.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY v.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getStatusCounts() {
  const client = await db.connect();
  try {
    const result = await client.query(`
      SELECT status, COUNT(*) as count
      FROM violations
      GROUP BY status
    `);
    const counts: Record<string, number> = { all: 0 };
    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
      counts.all += parseInt(row.count, 10);
    }
    return counts;
  } finally {
    client.release();
  }
}

interface PageProps {
  searchParams: { status?: string };
}

export default async function ManagerDashboardPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "manager" && userRole !== "admin") {
    redirect("/unauthorized");
  }

  const status = searchParams.status || "all";

  const [violations, statusCounts] = await Promise.all([
    getViolations(status),
    getStatusCounts(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor and manage all violations across your organization
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statusCounts.all || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statusCounts.pending || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">I</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      In Progress
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statusCounts.in_progress || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Resolved
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statusCounts.resolved || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-8">Loading violations...</div>
          }
        >
          <DashboardClient
            violations={violations}
            statusCounts={statusCounts}
            currentStatus={status}
          />
        </Suspense>
      </div>
    </div>
  );
}
