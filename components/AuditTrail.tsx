"use client";

import React from "react";

export interface AuditEntry {
  id?: string | number;
  action: string;
  actor: string;
  timestamp: string;
  notes?: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return iso;
  }
}

function getActionColor(action: string): string {
  const lower = action.toLowerCase();
  if (
    lower.includes("delete") ||
    lower.includes("remove") ||
    lower.includes("revoke")
  ) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (
    lower.includes("create") ||
    lower.includes("add") ||
    lower.includes("register")
  ) {
    return "bg-green-100 text-green-800 border-green-200";
  }
  if (
    lower.includes("update") ||
    lower.includes("edit") ||
    lower.includes("modify") ||
    lower.includes("change")
  ) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (
    lower.includes("login") ||
    lower.includes("logout") ||
    lower.includes("auth")
  ) {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }
  if (
    lower.includes("error") ||
    lower.includes("fail") ||
    lower.includes("denied")
  ) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function getTimelineDotColor(action: string): string {
  const lower = action.toLowerCase();
  if (
    lower.includes("delete") ||
    lower.includes("remove") ||
    lower.includes("revoke")
  ) {
    return "bg-red-500";
  }
  if (
    lower.includes("create") ||
    lower.includes("add") ||
    lower.includes("register")
  ) {
    return "bg-green-500";
  }
  if (
    lower.includes("update") ||
    lower.includes("edit") ||
    lower.includes("modify") ||
    lower.includes("change")
  ) {
    return "bg-blue-500";
  }
  if (
    lower.includes("login") ||
    lower.includes("logout") ||
    lower.includes("auth")
  ) {
    return "bg-purple-500";
  }
  if (
    lower.includes("error") ||
    lower.includes("fail") ||
    lower.includes("denied")
  ) {
    return "bg-orange-500";
  }
  return "bg-gray-400";
}

function getInitials(actor: string): string {
  return actor
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AuditTrail({ entries }: AuditTrailProps) {
  const sorted = React.useMemo(() => {
    return [...entries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [entries]);

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
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
        <p className="text-gray-500 font-medium">No audit entries found</p>
        <p className="text-gray-400 text-sm mt-1">
          Activity will appear here once recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <ol className="relative" aria-label="Audit trail timeline">
        {sorted.map((entry, index) => {
          const key =
            entry.id != null ? String(entry.id) : `${entry.timestamp}-${index}`;
          const dotColor = getTimelineDotColor(entry.action);
          const badgeColor = getActionColor(entry.action);
          const initials = getInitials(entry.actor);
          const isLast = index === sorted.length - 1;

          return (
            <li key={key} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Timeline line */}
              {!isLast && (
                <div
                  className="absolute left-4 top-8 bottom-0 w-px bg-gray-200"
                  aria-hidden="true"
                />
              )}

              {/* Timeline dot */}
              <div className="relative flex-shrink-0 flex items-start justify-center w-8 pt-1">
                <span
                  className={`w-3 h-3 rounded-full ring-2 ring-white ${dotColor} flex-shrink-0 mt-1`}
                  aria-hidden="true"
                />
              </div>

              {/* Card */}
              <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-150">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Action badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}
                    >
                      {entry.action}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <time
                    dateTime={entry.timestamp}
                    className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0"
                  >
                    {formatTimestamp(entry.timestamp)}
                  </time>
                </div>

                {/* Actor */}
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    aria-hidden="true"
                  >
                    {initials || "?"}
                  </div>
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {entry.actor}
                  </span>
                </div>

                {/* Notes */}
                {entry.notes && (
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-2">
                    {entry.notes}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
