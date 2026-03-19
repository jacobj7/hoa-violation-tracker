"use client";

import { useState, useMemo } from "react";

type Violation = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  location?: string;
  category?: string;
};

type SortField = keyof Violation | "days_outstanding";
type SortDirection = "asc" | "desc";

type Props = {
  violations: Violation[];
};

const STATUS_OPTIONS: Array<{
  value: Violation["status"] | "all";
  label: string;
  color: string;
}> = [
  {
    value: "all",
    label: "All",
    color: "bg-gray-100 text-gray-800 border-gray-300",
  },
  {
    value: "open",
    label: "Open",
    color: "bg-red-100 text-red-800 border-red-300",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  {
    value: "resolved",
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  {
    value: "closed",
    label: "Closed",
    color: "bg-gray-100 text-gray-600 border-gray-300",
  },
];

const SEVERITY_COLORS: Record<Violation["severity"], string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_BADGE_COLORS: Record<Violation["status"], string> = {
  open: "bg-red-100 text-red-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

function getDaysOutstanding(
  createdAt: string,
  status: Violation["status"],
): number {
  if (status === "closed" || status === "resolved") return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return (
      <span className="ml-1 text-gray-400 inline-block">
        <svg
          className="w-4 h-4 inline"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="ml-1 text-blue-600 inline-block">
      {sortDirection === "asc" ? (
        <svg
          className="w-4 h-4 inline"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 inline"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </span>
  );
}

export default function ViolationsClient({ violations }: Props) {
  const [statusFilter, setStatusFilter] = useState<Violation["status"] | "all">(
    "all",
  );
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: violations.length };
    for (const v of violations) {
      counts[v.status] = (counts[v.status] || 0) + 1;
    }
    return counts;
  }, [violations]);

  const filtered = useMemo(() => {
    let result = violations;

    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          (v.location && v.location.toLowerCase().includes(q)) ||
          (v.category && v.category.toLowerCase().includes(q)) ||
          (v.assigned_to && v.assigned_to.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [violations, statusFilter, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "days_outstanding") {
        aVal = getDaysOutstanding(a.created_at, a.status);
        bVal = getDaysOutstanding(b.created_at, b.status);
      } else {
        aVal = (a[sortField] as string) ?? "";
        bVal = (b[sortField] as string) ?? "";
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search violations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          const count = statusCounts[option.value] || 0;
          return (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                isActive
                  ? `${option.color} border-current shadow-sm ring-2 ring-offset-1 ring-current`
                  : `${option.color} opacity-70 hover:opacity-100`
              }`}
            >
              {option.label}
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  isActive ? "bg-white bg-opacity-50" : "bg-white bg-opacity-40"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-900">{sorted.length}</span>{" "}
        violation{sorted.length !== 1 ? "s" : ""}
        {statusFilter !== "all" && (
          <span>
            {" "}
            with status{" "}
            <span className="font-medium text-gray-900">
              {statusFilter.replace("_", " ")}
            </span>
          </span>
        )}
        {searchQuery && (
          <span>
            {" "}
            matching{" "}
            <span className="font-medium text-gray-900">
              &ldquo;{searchQuery}&rdquo;
            </span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("title")}
              >
                Title
                <SortIcon
                  field="title"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("category")}
              >
                Category
                <SortIcon
                  field="category"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("severity")}
              >
                Severity
                <SortIcon
                  field="severity"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("days_outstanding")}
              >
                Days Outstanding
                <SortIcon
                  field="days_outstanding"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("location")}
              >
                Location
                <SortIcon
                  field="location"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("assigned_to")}
              >
                Assigned To
                <SortIcon
                  field="assigned_to"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort("created_at")}
              >
                Created
                <SortIcon
                  field="created_at"
                  sortField={sortField}
                  sortDirection={sortDirection}
                />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 text-sm">No violations found</p>
                    {(statusFilter !== "all" || searchQuery) && (
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setSearchQuery("");
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((violation) => {
                const daysOutstanding = getDaysOutstanding(
                  violation.created_at,
                  violation.status,
                );
                const isOverdue =
                  daysOutstanding > 30 && violation.status === "open";
                return (
                  <tr
                    key={violation.id}
                    className="hover:bg-gray-50 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <div
                        className="text-sm font-medium text-gray-900 max-w-xs truncate"
                        title={violation.title}
                      >
                        {violation.title}
                      </div>
                      {violation.description && (
                        <div
                          className="text-xs text-gray-500 max-w-xs truncate mt-0.5"
                          title={violation.description}
                        >
                          {violation.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {violation.category || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${SEVERITY_COLORS[violation.severity]}`}
                      >
                        {violation.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE_COLORS[violation.status]}`}
                      >
                        {violation.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {violation.status === "open" ||
                      violation.status === "in_progress" ? (
                        <span
                          className={`text-sm font-medium ${
                            isOverdue
                              ? "text-red-600"
                              : daysOutstanding > 14
                                ? "text-orange-600"
                                : "text-gray-900"
                          }`}
                        >
                          {daysOutstanding}d
                          {isOverdue && (
                            <span className="ml-1 text-xs text-red-500 font-normal">
                              (overdue)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {violation.location || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {violation.assigned_to || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {new Date(violation.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
