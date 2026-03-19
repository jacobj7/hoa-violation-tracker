"use client";

import { useState } from "react";
import Link from "next/link";

type ViolationStatus = "all" | "open" | "pending" | "resolved" | "appealed";

interface Violation {
  id: string;
  propertyAddress: string;
  type: string;
  date: string;
  fineAmount: number;
  status: "open" | "pending" | "resolved" | "appealed";
}

interface DashboardClientProps {
  violations: Violation[];
}

const STATUS_TABS: { label: string; value: ViolationStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Appealed", value: "appealed" },
];

const STATUS_BADGE_STYLES: Record<Violation["status"], string> = {
  open: "bg-red-100 text-red-800 border border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  resolved: "bg-green-100 text-green-800 border border-green-200",
  appealed: "bg-blue-100 text-blue-800 border border-blue-200",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export default function DashboardClient({ violations }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<ViolationStatus>("all");

  const filteredViolations =
    activeTab === "all"
      ? violations
      : violations.filter((v) => v.status === activeTab);

  const countByStatus = (status: ViolationStatus) =>
    status === "all"
      ? violations.length
      : violations.filter((v) => v.status === status).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Violations Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track all property violations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {STATUS_TABS.filter((t) => t.value !== "all").map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-lg p-4 text-left transition-all shadow-sm hover:shadow-md ${
                activeTab === tab.value
                  ? "ring-2 ring-indigo-500 bg-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-medium text-gray-500 capitalize">
                {tab.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {countByStatus(tab.value)}
              </p>
            </button>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.value
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  aria-current={activeTab === tab.value ? "page" : undefined}
                >
                  {tab.label}
                  <span
                    className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                      activeTab === tab.value
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {countByStatus(tab.value)}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Table */}
          {filteredViolations.length === 0 ? (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No violations found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No violations match the selected filter.
              </p>
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
                      Property Address
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Violation Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Fine Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredViolations.map((violation) => (
                    <tr
                      key={violation.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {violation.propertyAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {violation.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(violation.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(violation.fineAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            STATUS_BADGE_STYLES[violation.status]
                          }`}
                        >
                          {violation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/violations/${violation.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filteredViolations.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium">{filteredViolations.length}</span>{" "}
                of <span className="font-medium">{violations.length}</span>{" "}
                violation{violations.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
