"use client";

import { useState } from "react";

interface StatusCounts {
  all: number;
  active: number;
  completed: number;
  pending: number;
  failed: number;
}

interface SummaryCard {
  label: string;
  value: number | string;
  description?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
}

interface PageClientProps {
  statusCounts: StatusCounts;
  summaryCards: SummaryCard[];
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    value: "text-blue-900",
    badge: "bg-blue-100 text-blue-800",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    value: "text-green-900",
    badge: "bg-green-100 text-green-800",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    value: "text-yellow-900",
    badge: "bg-yellow-100 text-yellow-800",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    value: "text-red-900",
    badge: "bg-red-100 text-red-800",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    value: "text-purple-900",
    badge: "bg-purple-100 text-purple-800",
  },
  gray: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    value: "text-gray-900",
    badge: "bg-gray-100 text-gray-800",
  },
};

type TabKey = keyof StatusCounts;

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

export default function PageClient({
  statusCounts,
  summaryCards,
}: PageClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const activeCount = statusCounts[activeTab];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => {
            const color = card.color ?? "gray";
            const classes = colorClasses[color];
            return (
              <div
                key={index}
                className={`rounded-xl border p-5 ${classes.bg} ${classes.border} transition-shadow hover:shadow-md`}
              >
                <p className={`text-sm font-medium ${classes.text}`}>
                  {card.label}
                </p>
                <p className={`mt-2 text-3xl font-bold ${classes.value}`}>
                  {card.value}
                </p>
                {card.description && (
                  <p className={`mt-1 text-xs ${classes.text} opacity-80`}>
                    {card.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Tabs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Status Breakdown
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = statusCounts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    isActive
                      ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-selected={isActive}
                  role="tab"
                >
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6" role="tabpanel">
            {activeCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">
                  No {activeTab === "all" ? "" : activeTab} items found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Items will appear here once they are created.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 font-medium">
                    Showing{" "}
                    <span className="font-bold text-gray-900">
                      {activeCount}
                    </span>{" "}
                    {activeTab === "all" ? "total" : activeTab}{" "}
                    {activeCount === 1 ? "item" : "items"}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      activeTab === "active"
                        ? "bg-green-100 text-green-700"
                        : activeTab === "completed"
                          ? "bg-blue-100 text-blue-700"
                          : activeTab === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : activeTab === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </span>
                </div>

                {/* Visual bar representing proportion */}
                {statusCounts.all > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Proportion of total</span>
                      <span>
                        {Math.round((activeCount / statusCounts.all) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          activeTab === "active"
                            ? "bg-green-500"
                            : activeTab === "completed"
                              ? "bg-blue-500"
                              : activeTab === "pending"
                                ? "bg-yellow-500"
                                : activeTab === "failed"
                                  ? "bg-red-500"
                                  : "bg-gray-500"
                        }`}
                        style={{
                          width:
                            activeTab === "all"
                              ? "100%"
                              : `${Math.round((activeCount / statusCounts.all) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Breakdown mini-grid when viewing all */}
                {activeTab === "all" && (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tabs
                      .filter((t) => t.key !== "all")
                      .map((t) => {
                        const count = statusCounts[t.key];
                        const pct =
                          statusCounts.all > 0
                            ? Math.round((count / statusCounts.all) * 100)
                            : 0;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className="text-left rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <p className="text-xs text-gray-500 font-medium capitalize">
                              {t.label}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                              {count}
                            </p>
                            <p className="text-xs text-gray-400">{pct}%</p>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
