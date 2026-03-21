import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";

interface MetricData {
  totalViolations: number;
  openViolations: number;
  overdueViolations: number;
  resolvedThisMonth: number;
}

interface OverdueViolation {
  id: number;
  unit_number: string;
  violation_type: string;
  description: string;
  due_date: string;
  days_overdue: number;
  status: string;
}

interface ViolationByType {
  violation_type: string;
  count: number;
  open_count: number;
}

async function getMetrics(): Promise<MetricData> {
  const client = await pool.connect();
  try {
    const totalResult = await client.query(
      "SELECT COUNT(*) as count FROM violations",
    );
    const openResult = await client.query(
      "SELECT COUNT(*) as count FROM violations WHERE status IN ('open', 'pending')",
    );
    const overdueResult = await client.query(
      "SELECT COUNT(*) as count FROM violations WHERE due_date < NOW() AND status NOT IN ('resolved', 'closed')",
    );
    const resolvedResult = await client.query(
      "SELECT COUNT(*) as count FROM violations WHERE status IN ('resolved', 'closed') AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())",
    );

    return {
      totalViolations: parseInt(totalResult.rows[0]?.count ?? "0"),
      openViolations: parseInt(openResult.rows[0]?.count ?? "0"),
      overdueViolations: parseInt(overdueResult.rows[0]?.count ?? "0"),
      resolvedThisMonth: parseInt(resolvedResult.rows[0]?.count ?? "0"),
    };
  } finally {
    client.release();
  }
}

async function getOverdueViolations(): Promise<OverdueViolation[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        v.id,
        u.unit_number,
        v.violation_type,
        v.description,
        v.due_date::text,
        EXTRACT(DAY FROM NOW() - v.due_date)::int as days_overdue,
        v.status
      FROM violations v
      LEFT JOIN units u ON v.unit_id = u.id
      WHERE v.due_date < NOW() 
        AND v.status NOT IN ('resolved', 'closed')
      ORDER BY v.due_date ASC
      LIMIT 10
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getViolationsByType(): Promise<ViolationByType[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        violation_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status IN ('open', 'pending')) as open_count
      FROM violations
      GROUP BY violation_type
      ORDER BY count DESC
    `);
    return result.rows.map((row) => ({
      violation_type: row.violation_type,
      count: parseInt(row.count),
      open_count: parseInt(row.open_count),
    }));
  } finally {
    client.release();
  }
}

function MetricCard({
  title,
  value,
  subtitle,
  colorClass,
  icon,
}: {
  title: string;
  value: number;
  subtitle?: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800",
    pending: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [metrics, overdueViolations, violationsByType] = await Promise.all([
    getMetrics(),
    getOverdueViolations(),
    getViolationsByType(),
  ]);

  const maxCount = Math.max(...violationsByType.map((v) => v.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Violations Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back,{" "}
            <span className="font-medium">
              {session.user?.name ?? session.user?.email}
            </span>
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Violations"
            value={metrics.totalViolations}
            colorClass="bg-indigo-50 text-indigo-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
          <MetricCard
            title="Open Violations"
            value={metrics.openViolations}
            subtitle="Requires attention"
            colorClass="bg-yellow-50 text-yellow-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
          <MetricCard
            title="Overdue"
            value={metrics.overdueViolations}
            subtitle="Past due date"
            colorClass="bg-red-50 text-red-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <MetricCard
            title="Resolved This Month"
            value={metrics.resolvedThisMonth}
            colorClass="bg-green-50 text-green-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overdue Violations Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Overdue Violations
              </h2>
              <Link
                href="/violations?filter=overdue"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all →
              </Link>
            </div>

            {overdueViolations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="w-12 h-12 text-green-400 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500 text-sm">
                  No overdue violations. Great job!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Overdue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {overdueViolations.map((violation) => (
                      <tr
                        key={violation.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {violation.unit_number ?? "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {violation.violation_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {violation.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`font-semibold ${violation.days_overdue > 30 ? "text-red-600" : "text-orange-500"}`}
                          >
                            {violation.days_overdue}d
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={violation.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Violations by Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Violations by Type
              </h2>
            </div>

            {violationsByType.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500 text-sm">
                  No violation data available.
                </p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-4">
                {violationsByType.map((item) => (
                  <div key={item.violation_type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                        {item.violation_type}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-indigo-600 font-semibold">
                          {item.open_count} open
                        </span>
                        <span>/ {item.count} total</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                    {item.open_count > 0 && (
                      <div className="w-full bg-transparent rounded-full h-1 mt-0.5">
                        <div
                          className="bg-yellow-400 h-1 rounded-full"
                          style={{
                            width: `${(item.open_count / maxCount) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 bg-indigo-500 rounded-full" />
                    Total
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-1.5 bg-yellow-400 rounded-full" />
                    Open
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
