"use client";

import React from "react";

export interface Violation {
  id: string | number;
  propertyAddress: string;
  category: string;
  status: string;
  date: string | Date;
  fineAmount: number;
}

interface ViolationTableProps {
  violations: Violation[];
}

const statusStyles: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  appealed: "bg-purple-100 text-purple-800",
};

function getStatusStyle(status: string): string {
  const normalized = status.toLowerCase().trim();
  return statusStyles[normalized] ?? "bg-gray-100 text-gray-700";
}

function formatDate(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ViolationTable({ violations }: ViolationTableProps) {
  if (!violations || violations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <p className="text-sm">No violations found.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              ID
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Property Address
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Category
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Fine Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {violations.map((violation, index) => (
            <tr
              key={violation.id ?? index}
              className="transition-colors duration-150 hover:bg-gray-50"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                #{String(violation.id)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span
                  className="block max-w-xs truncate"
                  title={violation.propertyAddress}
                >
                  {violation.propertyAddress || "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {violation.category || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusStyle(
                    violation.status || "",
                  )}`}
                >
                  {violation.status || "Unknown"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {formatDate(violation.date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                {formatCurrency(violation.fineAmount ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ViolationTable;
