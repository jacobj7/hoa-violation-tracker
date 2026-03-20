"use client";

import React from "react";

type ViolationStatus =
  | "open"
  | "under_inspection"
  | "fined"
  | "hearing_scheduled"
  | "resolved"
  | "closed";

interface ViolationStatusBadgeProps {
  status: ViolationStatus | string;
  className?: string;
}

const statusConfig: Record<
  ViolationStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  open: {
    label: "Open",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-300",
  },
  under_inspection: {
    label: "Under Inspection",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-300",
  },
  fined: {
    label: "Fined",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
  },
  hearing_scheduled: {
    label: "Hearing Scheduled",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-300",
  },
  resolved: {
    label: "Resolved",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-300",
  },
  closed: {
    label: "Closed",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
  },
};

const defaultConfig = {
  label: "Unknown",
  bgColor: "bg-gray-100",
  textColor: "text-gray-600",
  borderColor: "border-gray-200",
};

export default function ViolationStatusBadge({
  status,
  className = "",
}: ViolationStatusBadgeProps) {
  const config = statusConfig[status as ViolationStatus] ?? {
    ...defaultConfig,
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.textColor.replace("text-", "bg-")}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export type { ViolationStatus, ViolationStatusBadgeProps };
