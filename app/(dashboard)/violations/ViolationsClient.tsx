"use client";

import { useState, useEffect, useCallback } from "react";

type ViolationStatus = "open" | "in_review" | "resolved" | "all";

interface Violation {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_review" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
  location?: string;
  assigned_to?: string;
  category?: string;
}

interface ViolationCardProps {
  violation: Violation;
  onStatusChange: (id: string, status: Violation["status"]) => void;
}

function ViolationCard({ violation, onStatusChange }: ViolationCardProps) {
  const severityColors: Record<Violation["severity"], string> = {
    low: "bg-blue-100 text-blue-800 border-blue-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };

  const statusColors: Record<Violation["status"], string> = {
    open: "bg-red-50 text-red-700 border-red-200",
    in_review: "bg-yellow-50 text-yellow-700 border-yellow-200",
    resolved: "bg-green-50 text-green-700 border-green-200",
  };

  const statusLabels: Record<Violation["status"], string> = {
    open: "Open",
    in_review: "In Review",
    resolved: "Resolved",
  };

  const nextStatuses: Record<Violation["status"], Violation["status"][]> = {
    open: ["in_review", "resolved"],
    in_review: ["open", "resolved"],
    resolved: ["open", "in_review"],
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors[violation.severity]}`}
            >
              {violation.severity.charAt(0).toUpperCase() +
                violation.severity.slice(1)}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[violation.status]}`}
            >
              {statusLabels[violation.status]}
            </span>
            {violation.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {violation.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {violation.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {violation.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            {violation.location && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {violation.location}
              </span>
            )}
            {violation.assigned_to && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {violation.assigned_to}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {new Date(violation.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="relative group">
            <select
              value={violation.status}
              onChange={(e) =>
                onStatusChange(
                  violation.id,
                  e.target.value as Violation["status"],
                )
              }
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value={violation.status}>
                {statusLabels[violation.status]}
              </option>
              {nextStatuses[violation.status].map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg
                className="w-4 h-4"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_TABS: { label: string; value: ViolationStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Review", value: "in_review" },
  { label: "Resolved", value: "resolved" },
];

export default function ViolationsClient() {
  const [activeTab, setActiveTab] = useState<ViolationStatus>("all");
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<ViolationStatus, number>>({
    all: 0,
    open: 0,
    in_review: 0,
    resolved: 0,
  });

  const fetchViolations = useCallback(async (status: ViolationStatus) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") {
        params.set("status", status);
      }
      const res = await fetch(`/api/violations?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to fetch violations (${res.status})`,
        );
      }
      const data = await res.json();
      setViolations(data.violations ?? []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViolations(activeTab);
  }, [activeTab, fetchViolations]);

  const handleStatusChange = async (
    id: string,
    newStatus: Violation["status"],
  ) => {
    const previous = violations.find((v) => v.id === id);
    if (!previous || previous.status === newStatus) return;

    setViolations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v)),
    );

    try {
      const res = await fetch(`/api/violations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      await fetchViolations(activeTab);
    } catch {
      setViolations((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: previous.status } : v)),
      );
      setError("Failed to update violation status. Please try again.");
    }
  };

  const filteredViolations =
    activeTab === "all"
      ? violations
      : violations.filter((v) => v.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track compliance violations
          </p>
        </div>
        <button
          onClick={() => fetchViolations(activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
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
          Refresh
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-1" aria-label="Tabs">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = counts[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-500 hover:text-red-700"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                  <div className="flex gap-4">
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-8 w-28 bg-gray-200 rounded-md flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredViolations.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            No violations found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "all"
              ? "There are no violations to display."
              : `There are no ${activeTab.replace("_", " ")} violations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredViolations.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onStatusChange={handleStatusChange}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-2">
            Showing {filteredViolations.length} violation
            {filteredViolations.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
