"use client";

import React from "react";

interface MetricCard {
  label: string;
  value: number | string;
  color: string;
}

interface Violation {
  id: string;
  type: string;
  description: string;
  dueDate: string;
  status: string;
  severity: string;
  location: string;
}

interface ViolationByType {
  type: string;
  count: number;
  percentage: number;
}

interface DashboardData {
  metrics: {
    totalViolations: number;
    overdueViolations: number;
    resolvedThisMonth: number;
    openViolations: number;
  };
  overdueViolations: Violation[];
  violationsByType: ViolationByType[];
}

interface PageClientProps {
  data?: DashboardData;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const statusColors: Record<string, string> = {
  overdue: "bg-red-100 text-red-700",
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

const typeBarColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

export default function PageClient({ data }: PageClientProps) {
  const { metrics, overdueViolations, violationsByType } = data;

  const metricCards: MetricCard[] = [
    {
      label: "Total Violations",
      value: metrics.totalViolations,
      color: "border-l-blue-500",
    },
    {
      label: "Open Violations",
      value: metrics.openViolations,
      color: "border-l-yellow-500",
    },
    {
      label: "Overdue Violations",
      value: metrics.overdueViolations,
      color: "border-l-red-500",
    },
    {
      label: "Resolved This Month",
      value: metrics.resolvedThisMonth,
      color: "border-l-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Violations Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of compliance violations and their current status
          </p>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${card.color} p-6 flex flex-col gap-2`}
            >
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </span>
              <span className="text-4xl font-bold text-gray-900">
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Overdue Violations Table */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Overdue Violations
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {overdueViolations.length} overdue
              </span>
            </div>

            {overdueViolations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  No overdue violations. Great work!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {violation.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                            {violation.description}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {violation.location}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-red-600">
                            {violation.dueDate}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              severityColors[
                                violation.severity.toLowerCase()
                              ] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              statusColors[violation.status.toLowerCase()] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {violation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Violations by Type Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Violations by Type
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Distribution across categories
              </p>
            </div>

            {violationsByType.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-gray-500">
                  No violation data available.
                </p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-5">
                {violationsByType.map((item, index) => (
                  <div key={item.type} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-sm text-gray-500">
                          {item.count}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          typeBarColors[index % typeBarColors.length]
                        }`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Legend total */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Total</span>
                    <span className="font-bold text-gray-900">
                      {violationsByType.reduce(
                        (sum, item) => sum + item.count,
                        0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
