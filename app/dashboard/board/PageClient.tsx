"use client";

import { useState, useEffect, useCallback } from "react";
import ViolationTable from "@/components/ViolationTable";

type ViolationStatus = "all" | "open" | "in_progress" | "resolved" | "closed";

interface StatusCount {
  status: string;
  count: number;
}

interface Violation {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  address: string;
  reported_by: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface BoardData {
  statusCounts: StatusCount[];
  violations: Violation[];
  total: number;
}

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  open: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  in_progress: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  resolved: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  closed: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  all: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function PageClient() {
  const [selectedStatus, setSelectedStatus] = useState<ViolationStatus>("all");
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const res = await fetch(`/api/violations/board?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch board data");
      }
      const data: BoardData = await res.json();
      setBoardData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusFilter = (status: ViolationStatus) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const totalCount =
    boardData?.statusCounts.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const getCountForStatus = (status: string) => {
    return boardData?.statusCounts.find((s) => s.status === status)?.count ?? 0;
  };

  const totalPages = boardData ? Math.ceil(boardData.total / pageSize) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Community Violations Board
          </h1>
          <p className="mt-1 text-gray-500">
            Monitor and manage all community violations across the neighborhood.
          </p>
        </div>

        {/* Status Count Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {/* All Card */}
          <button
            onClick={() => handleStatusFilter("all")}
            className={`rounded-xl border-2 p-4 text-left transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              selectedStatus === "all"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              All
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {loading && !boardData ? "—" : totalCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">Total violations</p>
          </button>

          {/* Status Cards */}
          {(["open", "in_progress", "resolved", "closed"] as const).map(
            (status) => {
              const colors = STATUS_COLORS[status];
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`rounded-xl border-2 p-4 text-left transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isActive
                      ? `${colors.border} ${colors.bg} ring-2`
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {STATUS_LABELS[status]}
                  </p>
                  <p className={`mt-2 text-3xl font-bold ${colors.text}`}>
                    {loading && !boardData ? "—" : getCountForStatus(status)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">violations</p>
                </button>
              );
            },
          )}
        </div>

        {/* Violations Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header / Filters */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedStatus === "all"
                  ? "All Violations"
                  : `${STATUS_LABELS[selectedStatus]} Violations`}
              </h2>
              {boardData && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {boardData.total} result{boardData.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
                <input
                  type="text"
                  placeholder="Search violations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent w-56"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Refresh"
              >
                <svg
                  className={`h-4 w-4 text-gray-600 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">{error}</span>
                <button
                  onClick={fetchData}
                  className="ml-auto text-sm underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !boardData && (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Table */}
          {(!loading || boardData) && !error && boardData && (
            <ViolationTable
              violations={boardData.violations}
              loading={loading}
              onRefresh={fetchData}
            />
          )}

          {/* Empty State */}
          {!loading &&
            !error &&
            boardData &&
            boardData.violations.length === 0 && (
              <div className="px-6 py-16 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
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
                <p className="mt-4 text-gray-500 font-medium">
                  No violations found
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {debouncedSearch
                    ? `No results for "${debouncedSearch}"`
                    : selectedStatus !== "all"
                      ? `No ${STATUS_LABELS[selectedStatus].toLowerCase()} violations at this time.`
                      : "No violations have been reported yet."}
                </p>
              </div>
            )}

          {/* Pagination */}
          {boardData && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          pageNum === page
                            ? "bg-blue-600 text-white font-semibold"
                            : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
