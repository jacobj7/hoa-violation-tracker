import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

interface SummaryStats {
  totalViolations: number;
  pendingViolations: number;
  resolvedViolations: number;
  criticalViolations: number;
  recentViolations: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    createdAt: string;
  }>;
  userRole: string;
  userName: string;
}

async function getDashboardSummary(): Promise<SummaryStats | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/dashboard/summary`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return null;
  }
}

function StatCard({
  title,
  value,
  description,
  colorClass,
}: {
  title: string;
  value: number;
  description: string;
  colorClass: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-current">
      <div className={`${colorClass}`}>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        classes[severity.toLowerCase()] || "bg-gray-100 text-gray-800"
      }`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    open: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
    "in-progress": "bg-purple-100 text-purple-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        classes[status.toLowerCase()] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const summary = await getDashboardSummary();

  const isAdmin =
    session.user?.role === "admin" || session.user?.role === "supervisor";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back,{" "}
              <span className="font-medium">
                {session.user?.name || session.user?.email}
              </span>
              {session.user?.role && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {session.user.role}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/violations"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Violations Queue
            </Link>
            <Link
              href="/violations/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Violation
            </Link>
          </div>
        </div>

        {summary ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                <p className="text-sm font-medium text-gray-600">
                  Total Violations
                </p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">
                  {summary.totalViolations}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time records</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <p className="text-sm font-medium text-gray-600">
                  Pending Review
                </p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {summary.pendingViolations}
                </p>
                <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {summary.resolvedViolations}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully closed
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {summary.criticalViolations}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Require immediate attention
                </p>
              </div>
            </div>

            {/* Admin-only section */}
            {isAdmin && (
              <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-indigo-600 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <h2 className="text-sm font-semibold text-indigo-800">
                    Admin Overview
                  </h2>
                </div>
                <p className="text-sm text-indigo-700 mt-2">
                  You have elevated access. You can manage all violations,
                  assign reviewers, and configure system settings.
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href="/admin/users"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Manage Users
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    System Settings
                  </Link>
                  <Link
                    href="/admin/reports"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Reports
                  </Link>
                </div>
              </div>
            )}

            {/* Recent Violations */}
            {summary.recentViolations &&
              summary.recentViolations.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Recent Violations
                    </h2>
                    <Link
                      href="/violations"
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View all →
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {summary.recentViolations.map((violation) => (
                      <div
                        key={violation.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/violations/${violation.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate block"
                          >
                            {violation.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(violation.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <SeverityBadge severity={violation.severity} />
                          <StatusBadge status={violation.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {summary.recentViolations?.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No violations yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Get started by creating your first violation report.
                </p>
                <div className="mt-6">
                  <Link
                    href="/violations/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create Violation
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Error / Loading fallback */
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Unable to load dashboard data
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                There was an error fetching your summary statistics. Please try
                refreshing the page.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Link
                  href="/violations"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Violations Queue
                </Link>
                <Link
                  href="/violations/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  New Violation
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
