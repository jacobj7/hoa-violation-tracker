"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export interface Violation {
  id: string | number;
  address: string;
  category: string;
  status: "open" | "closed" | "pending" | "resolved" | string;
  date: string | Date;
  description: string;
}

interface ViolationCardProps {
  violation: Violation;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-800 border border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  closed: "bg-green-100 text-green-800 border border-green-200",
  resolved: "bg-blue-100 text-blue-800 border border-blue-200",
};

function getStatusStyle(status: string): string {
  return (
    STATUS_STYLES[status.toLowerCase()] ??
    "bg-gray-100 text-gray-800 border border-gray-200"
  );
}

function truncate(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

function formatDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return String(date);
  }
}

export function ViolationCard({
  violation,
  className = "",
}: ViolationCardProps) {
  const { id, address, category, status, date, description } = violation;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col gap-3 ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
            {category}
          </p>
          <h3
            className="text-base font-semibold text-gray-900 truncate"
            title={address}
          >
            {address}
          </h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusStyle(status)}`}
        >
          {status}
        </span>
      </div>

      {/* Description snippet */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {truncate(description)}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <time
          className="text-xs text-gray-400"
          dateTime={typeof date === "string" ? date : date.toISOString()}
          title={typeof date === "string" ? date : date.toISOString()}
        >
          {formatDate(date)}
        </time>
        <Link
          href={`/violations/${id}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors duration-150"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

export default ViolationCard;
