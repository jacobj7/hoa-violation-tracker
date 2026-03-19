"use client";

import React from "react";

type ViolationStatus =
  | "open"
  | "notified"
  | "hearing_scheduled"
  | "resolved"
  | "closed";

interface StatusBadgeProps {
  status: ViolationStatus | string;
  className?: string;
}

const statusConfig: Record<
  ViolationStatus,
  { label: string; classes: string }
> = {
  open: {
    label: "Open",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
  notified: {
    label: "Notified",
    classes: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  hearing_scheduled: {
    label: "Hearing Scheduled",
    classes: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
  closed: {
    label: "Closed",
    classes: "bg-gray-100 text-gray-700 border border-gray-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  classes: "bg-slate-100 text-slate-700 border border-slate-200",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status as ViolationStatus] ?? {
    ...defaultConfig,
    label:
      status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
      defaultConfig.label,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
