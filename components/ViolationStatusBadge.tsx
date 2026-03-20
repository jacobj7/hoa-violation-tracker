"use client";

import React from "react";

export type ViolationStatus =
  | "open"
  | "notified"
  | "fined"
  | "appealed"
  | "resolved"
  | "closed";

interface ViolationStatusBadgeProps {
  status: ViolationStatus;
  className?: string;
}

const statusConfig: Record<
  ViolationStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  open: {
    label: "Open",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
  },
  notified: {
    label: "Notified",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-300",
  },
  fined: {
    label: "Fined",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-300",
  },
  appealed: {
    label: "Appealed",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-300",
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
    textColor: "text-gray-800",
    borderColor: "border-gray-300",
  },
};

export function ViolationStatusBadge({
  status,
  className = "",
}: ViolationStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.closed;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      role="status"
      aria-label={`Violation status: ${config.label}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.textColor.replace("text-", "bg-").replace("-800", "-500")}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export default ViolationStatusBadge;
