"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

type PaymentStatus = "all" | "pending" | "paid" | "waived";

interface Fine {
  id: string;
  amount: number;
  violation: string;
  property: string;
  dueDate: string;
  paymentStatus: "pending" | "paid" | "waived";
  createdAt: string;
  description?: string;
}

const STATUS_TABS: { label: string; value: PaymentStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Waived", value: "waived" },
];

const STATUS_STYLES: Record<Fine["paymentStatus"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  paid: "bg-green-100 text-green-800 border border-green-200",
  waived: "bg-gray-100 text-gray-600 border border-gray-200",
};

const STATUS_LABELS: Record<Fine["paymentStatus"], string> = {
  pending: "Pending",
  paid: "Paid",
  waived: "Waived",
};

export default function FinesClient() {
  const [activeTab, setActiveTab] = useState<PaymentStatus>("all");
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("status", activeTab);
      }
      const res = await fetch(`/api/fines?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch fines");
      }
      const data = await res.json();
      setFines(data.fines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const updateStatus = async (
    fineId: string,
    newStatus: Fine["paymentStatus"],
  ) => {
    setUpdatingId(fineId);
    try {
      const res = await fetch(`/api/fines/${fineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update fine");
      }
      await fetchFines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update fine");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dueDate: string, status: Fine["paymentStatus"]) => {
    if (status !== "pending") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fine Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all property fines and violations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(["pending", "paid", "waived"] as Fine["paymentStatus"][]).map(
            (status) => {
              const statusFines = fines.filter(
                (f) => f.paymentStatus === status,
              );
              const total = statusFines.reduce((sum, f) => sum + f.amount, 0);
              return (
                <div
                  key={status}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 capitalize">
                        {status}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {statusFines.length} fine
                        {statusFines.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 py-4 px-1 text-center text-sm font-medium border-b-2 transition-colors duration-150 ${
                    activeTab === tab.value
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchFines}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : fines.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  No {activeTab !== "all" ? activeTab : ""} fines found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fines.map((fine) => (
                  <div
                    key={fine.id}
                    className={`bg-white border rounded-xl p-5 transition-shadow hover:shadow-md ${
                      isOverdue(fine.dueDate, fine.paymentStatus)
                        ? "border-red-200 bg-red-50/30"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Left: Fine Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {fine.violation}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[fine.paymentStatus]}`}
                          >
                            {STATUS_LABELS[fine.paymentStatus]}
                          </span>
                          {isOverdue(fine.dueDate, fine.paymentStatus) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                              Overdue
                            </span>
                          )}
                        </div>

                        {fine.description && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {fine.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            {fine.property}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Due {formatDate(fine.dueDate)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Issued {formatDate(fine.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount + Actions */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(fine.amount)}
                        </p>

                        {fine.paymentStatus === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(fine.id, "paid")}
                              disabled={updatingId === fine.id}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updatingId === fine.id ? (
                                <svg
                                  className="animate-spin h-3 w-3 mr-1"
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
                              ) : null}
                              Mark Paid
                            </button>
                            <button
                              onClick={() => updateStatus(fine.id, "waived")}
                              disabled={updatingId === fine.id}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                            >
                              Waive
                            </button>
                          </div>
                        )}

                        {fine.paymentStatus === "paid" && (
                          <button
                            onClick={() => updateStatus(fine.id, "pending")}
                            disabled={updatingId === fine.id}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                          >
                            Revert to Pending
                          </button>
                        )}

                        {fine.paymentStatus === "waived" && (
                          <button
                            onClick={() => updateStatus(fine.id, "pending")}
                            disabled={updatingId === fine.id}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                          >
                            Revert to Pending
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
