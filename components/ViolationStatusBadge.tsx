"use client";

import React from "react";

type ViolationStatus = "open" | "notified" | "disputed" | "resolved" | "closed";

interface ViolationStatusBadgeProps {
  status: string;
}

const statusConfig: Record<
  ViolationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  notified: {
    label: "Notified",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  disputed: {
    label: "Disputed",
    className: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  className: "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function ViolationStatusBadge({
  status,
}: ViolationStatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() as ViolationStatus;
  const config = statusConfig[normalizedStatus] ?? defaultConfig;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          normalizedStatus === "open"
            ? "bg-red-500"
            : normalizedStatus === "notified"
              ? "bg-yellow-500"
              : normalizedStatus === "disputed"
                ? "bg-orange-500"
                : normalizedStatus === "resolved"
                  ? "bg-green-500"
                  : normalizedStatus === "closed"
                    ? "bg-gray-500"
                    : "bg-gray-400"
        }`}
      />
      {config.label}
    </span>
  );
}
