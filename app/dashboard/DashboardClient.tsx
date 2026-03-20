"use client";

import { useState } from "react";

interface Violation {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
  property_address?: string;
  assignee_name?: string;
  notice_sent?: boolean;
  notice_sent_at?: string;
}

interface DashboardClientProps {
  violations: Violation[];
}

const STATUS_BADGE_STYLES: Record<Violation["status"], string> = {
  open: "bg-red-100 text-red-800 border border-red-200",
  in_progress: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  resolved: "bg-green-100 text-green-800 border border-green-200",
  closed: "bg-gray-100 text-gray-800 border border-gray-200",
};

const STATUS_LABELS: Record<Violation["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const SEVERITY_BADGE_STYLES: Record<Violation["severity"], string> = {
  low: "bg-blue-50 text-blue-700 border border-blue-200",
  medium: "bg-orange-50 text-orange-700 border border-orange-200",
  high: "bg-red-50 text-red-700 border border-red-200",
  critical: "bg-purple-100 text-purple-800 border border-purple-300",
};

function calculateDaysOpen(
  createdAt: string,
  status: Violation["status"],
): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardClient({
  violations: initialViolations,
}: DashboardClientProps) {
  const [violations, setViolations] = useState<Violation[]>(initialViolations);
  const [loadingNotice, setLoadingNotice] = useState<Record<string, boolean>>(
    {},
  );
  const [noticeErrors, setNoticeErrors] = useState<Record<string, string>>({});
  const [noticeSuccess, setNoticeSuccess] = useState<Record<string, boolean>>(
    {},
  );
  const [sortField, setSortField] = useState<keyof Violation | "days_open">(
    "created_at",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<Violation["status"] | "all">(
    "all",
  );
  const [filterSeverity, setFilterSeverity] = useState<
    Violation["severity"] | "all"
  >("all");

  const handleIssueNotice = async (violationId: string) => {
    setLoadingNotice((prev) => ({ ...prev, [violationId]: true }));
    setNoticeErrors((prev) => ({ ...prev, [violationId]: "" }));
    setNoticeSuccess((prev) => ({ ...prev, [violationId]: false }));

    try {
      const response = await fetch(`/api/violations/${violationId}/notice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to issue notice" }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();

      setViolations((prev) =>
        prev.map((v) =>
          v.id === violationId
            ? {
                ...v,
                notice_sent: true,
                notice_sent_at: data.notice_sent_at || new Date().toISOString(),
              }
            : v,
        ),
      );
      setNoticeSuccess((prev) => ({ ...prev, [violationId]: true }));

      setTimeout(() => {
        setNoticeSuccess((prev) => ({ ...prev, [violationId]: false }));
      }, 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setNoticeErrors((prev) => ({ ...prev, [violationId]: message }));
    } finally {
      setLoadingNotice((prev) => ({ ...prev, [violationId]: false }));
    }
  };

  const handleSort = (field: keyof Violation | "days_open") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedViolations = [...violations]
    .filter((v) => filterStatus === "all" || v.status === filterStatus)
    .filter((v) => filterSeverity === "all" || v.severity === filterSeverity)
    .sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "days_open") {
        aVal = calculateDaysOpen(a.created_at, a.status);
        bVal = calculateDaysOpen(b.created_at, b.status);
      } else {
        aVal = a[sortField] as string;
        bVal = b[sortField] as string;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Violation | "days_open" }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400 inline-block">↕</span>;
    }
    return (
      <span className="ml-1 text-blue-600 inline-block">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const openCount = violations.filter((v) => v.status === "open").length;
  const inProgressCount = violations.filter(
    (v) => v.status === "in_progress",
  ).length;
  const criticalCount = violations.filter(
    (v) => v.severity === "critical",
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Open Violations</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{openCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">In Progress</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {inProgressCount}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Critical Severity</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {criticalCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-gray-700"
            >
              Status:
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as Violation["status"] | "all")
              }
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="severity-filter"
              className="text-sm font-medium text-gray-700"
            >
              Severity:
            </label>
            <select
              id="severity-filter"
              value={filterSeverity}
              onChange={(e) =>
                setFilterSeverity(
                  e.target.value as Violation["severity"] | "all",
                )
              }
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 ml-auto">
            Showing {filteredAndSortedViolations.length} of {violations.length}{" "}
            violations
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredAndSortedViolations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No violations found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("title")}
                  >
                    Title <SortIcon field="title" />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Property
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIcon field="status" />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("severity")}
                  >
                    Severity <SortIcon field="severity" />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("days_open")}
                  >
                    Days Open <SortIcon field="days_open" />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("created_at")}
                  >
                    Created <SortIcon field="created_at" />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Assignee
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    Notice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAndSortedViolations.map((violation) => {
                  const daysOpen = calculateDaysOpen(
                    violation.created_at,
                    violation.status,
                  );
                  const isLoading = loadingNotice[violation.id];
                  const hasError = noticeErrors[violation.id];
                  const isSuccess = noticeSuccess[violation.id];
                  const noticeSent = violation.notice_sent;

                  return (
                    <tr
                      key={violation.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {violation.title}
                          </p>
                          {violation.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {violation.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">
                          {violation.property_address || (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[violation.status]}`}
                        >
                          {STATUS_LABELS[violation.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${SEVERITY_BADGE_STYLES[violation.severity]}`}
                        >
                          {violation.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            daysOpen > 30
                              ? "text-red-600"
                              : daysOpen > 14
                                ? "text-orange-600"
                                : "text-gray-700"
                          }`}
                        >
                          {daysOpen} {daysOpen === 1 ? "day" : "days"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">
                          {formatDate(violation.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">
                          {violation.assignee_name || (
                            <span className="text-gray-400 italic">
                              Unassigned
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {noticeSent ? (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                ✓ Notice Sent
                              </span>
                              {violation.notice_sent_at && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatDate(violation.notice_sent_at)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleIssueNotice(violation.id)}
                              disabled={
                                isLoading ||
                                violation.status === "closed" ||
                                violation.status === "resolved"
                              }
                              className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                                isLoading
                                  ? "bg-blue-400 text-white cursor-not-allowed"
                                  : violation.status === "closed" ||
                                      violation.status === "resolved"
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                    : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                              }`}
                            >
                              {isLoading ? (
                                <>
                                  <svg
                                    className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                  </svg>
                                  Sending…
                                </>
                              ) : (
                                "Issue Notice"
                              )}
                            </button>
                          )}
                          {isSuccess && !noticeSent && (
                            <p className="text-xs text-green-600 font-medium">
                              Notice issued!
                            </p>
                          )}
                          {hasError && (
                            <p className="text-xs text-red-600 max-w-[140px] leading-tight">
                              {hasError}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
