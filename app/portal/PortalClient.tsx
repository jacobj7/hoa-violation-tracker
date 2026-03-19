"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Violation {
  id: string;
  propertyAddress: string;
  violationType: string;
  description: string;
  dateIssued: string;
  status: "open" | "resolved" | "appealed";
  fineAmount: number;
  finePaid: number;
  noticeUrl?: string;
}

interface PortalData {
  ownerName: string;
  totalFineBalance: number;
  violations: Violation[];
}

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  resolved: "bg-green-100 text-green-800",
  appealed: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  resolved: "Resolved",
  appealed: "Under Appeal",
};

export default function PortalClient() {
  const { data: session, status } = useSession();
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Violation>("dateIssued");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPortalData();
    }
  }, [status]);

  async function fetchPortalData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/portal/violations");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load portal data");
      }
      const data = await res.json();
      setPortalData(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadNotice(violationId: string, noticeUrl: string) {
    try {
      setDownloadingId(violationId);
      const res = await fetch(`/api/portal/notice/${violationId}`);
      if (!res.ok) {
        throw new Error("Failed to download notice");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `violation-notice-${violationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  function handleSort(field: keyof Violation) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-500 text-sm">
            Please sign in to access your property violations portal.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchPortalData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!portalData) return null;

  const filteredViolations = portalData.violations
    .filter((v) => filterStatus === "all" || v.status === filterStatus)
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined || bVal === undefined) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const openViolations = portalData.violations.filter(
    (v) => v.status === "open",
  ).length;
  const resolvedViolations = portalData.violations.filter(
    (v) => v.status === "resolved",
  ).length;
  const appealedViolations = portalData.violations.filter(
    (v) => v.status === "appealed",
  ).length;

  function SortIcon({ field }: { field: keyof Violation }) {
    if (sortField !== field) {
      return (
        <svg
          className="inline ml-1 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg
        className="inline ml-1 h-4 w-4 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
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
        className="inline ml-1 h-4 w-4 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Property Violations Portal
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Welcome back,{" "}
              <span className="font-medium text-gray-700">
                {portalData.ownerName}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {session?.user?.email}
            </span>
            <button
              onClick={() => (window.location.href = "/api/auth/signout")}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Total Fine Balance
            </p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(portalData.totalFineBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Outstanding amount due</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Open Violations
            </p>
            <p className="text-2xl font-bold text-gray-900">{openViolations}</p>
            <p className="text-xs text-gray-400 mt-1">Require attention</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Under Appeal
            </p>
            <p className="text-2xl font-bold text-yellow-600">
              {appealedViolations}
            </p>
            <p className="text-xs text-gray-400 mt-1">Pending review</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Resolved
            </p>
            <p className="text-2xl font-bold text-green-600">
              {resolvedViolations}
            </p>
            <p className="text-xs text-gray-400 mt-1">Closed violations</p>
          </div>
        </div>

        {/* Violations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">Violations</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="statusFilter" className="text-sm text-gray-500">
                Filter:
              </label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="appealed">Under Appeal</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {filteredViolations.length === 0 ? (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-10 w-10 text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 text-sm">
                No violations found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("propertyAddress")}
                    >
                      Property <SortIcon field="propertyAddress" />
                    </th>
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("violationType")}
                    >
                      Type <SortIcon field="violationType" />
                    </th>
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("dateIssued")}
                    >
                      Date Issued <SortIcon field="dateIssued" />
                    </th>
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("status")}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("fineAmount")}
                    >
                      Fine <SortIcon field="fineAmount" />
                    </th>
                    <th
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap"
                      onClick={() => handleSort("finePaid")}
                    >
                      Paid <SortIcon field="finePaid" />
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Notice
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredViolations.map((violation) => {
                    const balance = violation.fineAmount - violation.finePaid;
                    return (
                      <tr
                        key={violation.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div
                            className="font-medium text-gray-900 max-w-[200px] truncate"
                            title={violation.propertyAddress}
                          >
                            {violation.propertyAddress}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-700 font-medium">
                            {violation.violationType}
                          </div>
                          <div
                            className="text-gray-400 text-xs mt-0.5 max-w-[180px] truncate"
                            title={violation.description}
                          >
                            {violation.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {formatDate(violation.dateIssued)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[violation.status]}`}
                          >
                            {statusLabels[violation.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium whitespace-nowrap">
                          {formatCurrency(violation.fineAmount)}
                        </td>
                        <td className="px-6 py-4 text-green-600 font-medium whitespace-nowrap">
                          {formatCurrency(violation.finePaid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {violation.noticeUrl ? (
                            <button
                              onClick={() =>
                                handleDownloadNotice(
                                  violation.id,
                                  violation.noticeUrl!,
                                )
                              }
                              disabled={downloadingId === violation.id}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {downloadingId === violation.id ? (
                                <>
                                  <svg
                                    className="h-3.5 w-3.5 animate-spin"
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
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  Download PDF
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Not available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredViolations.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filteredViolations.length} of{" "}
              {portalData.violations.length} violation
              {portalData.violations.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Fine Balance Summary */}
        {portalData.totalFineBalance > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-800 text-sm">
                Outstanding Balance Due
              </h3>
              <p className="text-red-600 text-xs mt-0.5">
                You have an outstanding fine balance of{" "}
                <span className="font-bold">
                  {formatCurrency(portalData.totalFineBalance)}
                </span>
                . Please contact the violations office to arrange payment.
              </p>
            </div>
            <div className="text-2xl font-bold text-red-700 whitespace-nowrap">
              {formatCurrency(portalData.totalFineBalance)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
