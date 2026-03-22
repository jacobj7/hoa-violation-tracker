"use client";

import { useState } from "react";

type ViolationStatus = "all" | "reported" | "under_review" | "resolved";

interface Violation {
  id: string;
  title: string;
  description: string;
  status: "reported" | "under_review" | "resolved";
  severity: string;
  location: string;
  reported_by: string;
  created_at: string;
  updated_at: string;
}

interface PageClientProps {
  violations?: Violation[];
}

const STATUS_LABELS: Record<ViolationStatus, string> = {
  all: "All",
  reported: "Reported",
  under_review: "Under Review",
  resolved: "Resolved",
};

const STATUS_COLORS: Record<Violation["status"], string> = {
  reported: "bg-red-100 text-red-800",
  under_review: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
  critical: "bg-purple-100 text-purple-800",
};

export default function PageClient({ violations }: PageClientProps) {
  const [activeFilter, setActiveFilter] = useState<ViolationStatus>("all");

  const filteredViolations =
    activeFilter === "all"
      ? violations
      : violations.filter((v) => v.status === activeFilter);

  const counts: Record<ViolationStatus, number> = {
    all: violations.length,
    reported: violations.filter((v) => v.status === "reported").length,
    under_review: violations.filter((v) => v.status === "under_review").length,
    resolved: violations.filter((v) => v.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
        <span className="text-sm text-gray-500">
          {filteredViolations.length} record
          {filteredViolations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABELS) as ViolationStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              activeFilter === status
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            }`}
          >
            {STATUS_LABELS[status]}
            <span
              className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-semibold ${
                activeFilter === status
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-4 h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-500">
              No violations found
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {activeFilter !== "all"
                ? `No violations with status "${STATUS_LABELS[activeFilter]}"`
                : "No violations have been reported yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Location
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Severity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Reported By
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredViolations.map((violation) => (
                  <tr
                    key={violation.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {violation.title}
                        </p>
                        {violation.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {violation.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {violation.location || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          SEVERITY_COLORS[violation.severity?.toLowerCase()] ??
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {violation.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[violation.status]
                        }`}
                      >
                        {STATUS_LABELS[violation.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {violation.reported_by || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {violation.created_at
                        ? new Date(violation.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
