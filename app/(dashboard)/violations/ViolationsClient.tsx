"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

type ViolationStatus =
  | "all"
  | "open"
  | "confirmed"
  | "notice_issued"
  | "fine_applied"
  | "resolved"
  | "appealed";

interface Violation {
  id: string;
  address: string;
  category: string;
  inspector_name: string | null;
  status: string;
  cure_deadline: string | null;
  created_at: string;
}

interface ViolationsClientProps {
  violations: Violation[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
}

const STATUS_TABS: { label: string; value: ViolationStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Notice Issued", value: "notice_issued" },
  { label: "Fine Applied", value: "fine_applied" },
  { label: "Resolved", value: "resolved" },
  { label: "Appealed", value: "appealed" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  confirmed: "bg-orange-100 text-orange-800 border border-orange-200",
  notice_issued: "bg-blue-100 text-blue-800 border border-blue-200",
  fine_applied: "bg-red-100 text-red-800 border border-red-200",
  resolved: "bg-green-100 text-green-800 border border-green-200",
  appealed: "bg-purple-100 text-purple-800 border border-purple-200",
};

function StatusBadge({ status }: { status: string }) {
  const styles =
    STATUS_BADGE_STYLES[status] ??
    "bg-gray-100 text-gray-800 border border-gray-200";
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export default function ViolationsClient({
  violations,
  total,
  page,
  pageSize,
  status,
}: ViolationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(total / pageSize);

  function buildUrl(params: Record<string, string>) {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    return `/violations?${current.toString()}`;
  }

  function handleStatusChange(newStatus: ViolationStatus) {
    router.push(
      buildUrl({ status: newStatus === "all" ? "" : newStatus, page: "1" }),
    );
  }

  function handlePageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  const activeStatus: ViolationStatus = (status as ViolationStatus) || "all";

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-1 overflow-x-auto"
          aria-label="Tabs"
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={`
                  whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {violations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-300 mb-4"
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
            <p className="text-sm font-medium">No violations found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Inspector
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Cure Deadline
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {violations.map((violation) => (
                  <tr
                    key={violation.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {violation.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {violation.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {violation.inspector_name ?? (
                          <span className="text-gray-400 italic">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={violation.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {violation.cure_deadline ? (
                        <div className="text-sm text-gray-700">
                          <span
                            className={
                              new Date(violation.cure_deadline) < new Date()
                                ? "text-red-600 font-medium"
                                : "text-gray-700"
                            }
                          >
                            {format(
                              new Date(violation.cure_deadline),
                              "MMM d, yyyy",
                            )}
                          </span>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(
                              new Date(violation.cure_deadline),
                              {
                                addSuffix: true,
                              },
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {format(new Date(violation.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(violation.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/violations/${violation.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{(page - 1) * pageSize + 1}</span> –{" "}
            <span className="font-medium">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-medium">{total}</span> violations
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            {/* Page number buttons */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
