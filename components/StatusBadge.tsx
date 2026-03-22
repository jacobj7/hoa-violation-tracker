"use client";

import React from "react";

type Status =
  | "open"
  | "confirmed"
  | "notice_issued"
  | "fine_applied"
  | "resolved"
  | "appealed";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  notice_issued: {
    label: "Notice Issued",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  fine_applied: {
    label: "Fine Applied",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  appealed: {
    label: "Appealed",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  className: "bg-gray-100 text-gray-800 border-gray-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as Status] ?? {
    ...defaultConfig,
    label: status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
