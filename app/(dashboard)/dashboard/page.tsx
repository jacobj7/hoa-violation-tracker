import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";

async function getDashboardStats(userId: string) {
  const client = await pool.connect();
  try {
    const openViolationsResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM violations 
       WHERE user_id = $1 AND status = 'open'`,
      [userId],
    );

    const pendingNoticesResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM notices 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId],
    );

    const recentViolationsResult = await client.query(
      `SELECT id, title, description, status, created_at, severity
       FROM violations 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId],
    );

    const recentNoticesResult = await client.query(
      `SELECT id, title, description, status, created_at
       FROM notices 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId],
    );

    return {
      openViolations: parseInt(openViolationsResult.rows[0]?.count ?? "0", 10),
      pendingNotices: parseInt(pendingNoticesResult.rows[0]?.count ?? "0", 10),
      recentViolations: recentViolationsResult.rows,
      recentNotices: recentNoticesResult.rows,
    };
  } finally {
    client.release();
  }
}

function StatCard({
  title,
  value,
  description,
  href,
  colorClass,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  colorClass: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass.replace("text-", "bg-").replace("-600", "-100")}`}
          >
            <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[severity] ?? "bg-gray-100 text-gray-800"}`}
    >
      {severity ?? "unknown"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    closed: "bg-green-100 text-green-800",
    resolved: "bg-green-100 text-green-800",
    sent: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  let stats = {
    openViolations: 0,
    pendingNotices: 0,
    recentViolations: [] as Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      created_at: string;
      severity: string;
    }>,
    recentNotices: [] as Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      created_at: string;
    }>,
  };

  try {
    stats = await getDashboardStats(session.user.id);
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {session.user.name ?? session.user.email}. Here&apos;s
            your overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-8">
          <StatCard
            title="Open Violations"
            value={stats.openViolations}
            description="Violations requiring attention"
            href="/dashboard/violations"
            colorClass="text-red-600"
          />
          <StatCard
            title="Pending Notices"
            value={stats.pendingNotices}
            description="Notices awaiting action"
            href="/dashboard/notices"
            colorClass="text-yellow-600"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Violations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Violations
              </h2>
              <Link
                href="/dashboard/violations"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats.recentViolations.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p className="text-sm">No violations found.</p>
                  <Link
                    href="/dashboard/violations/new"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Create your first violation report
                  </Link>
                </div>
              ) : (
                stats.recentViolations.map((violation) => (
                  <Link
                    key={violation.id}
                    href={`/dashboard/violations/${violation.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {violation.title}
                        </p>
                        {violation.description && (
                          <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {violation.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(violation.created_at)}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={violation.status} />
                        {violation.severity && (
                          <SeverityBadge severity={violation.severity} />
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Notices */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Notices
              </h2>
              <Link
                href="/dashboard/notices"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats.recentNotices.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p className="text-sm">No notices found.</p>
                  <Link
                    href="/dashboard/notices/new"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Create your first notice
                  </Link>
                </div>
              ) : (
                stats.recentNotices.map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/dashboard/notices/${notice.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notice.title}
                        </p>
                        {notice.description && (
                          <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {notice.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notice.created_at)}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <StatusBadge status={notice.status} />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/violations/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
            >
              + New Violation
            </Link>
            <Link
              href="/dashboard/notices/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
            >
              + New Notice
            </Link>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
