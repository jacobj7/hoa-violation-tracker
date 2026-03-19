import React from "react";

type ViolationStatus = "open" | "pending" | "resolved" | "appealed";

interface StatusBadgeProps {
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
    borderColor: "border-red-200",
  },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",
  },
  resolved: {
    label: "Resolved",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  appealed: {
    label: "Appealed",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200 ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === "open"
            ? "bg-red-500"
            : status === "pending"
              ? "bg-yellow-500"
              : status === "resolved"
                ? "bg-green-500"
                : "bg-blue-500"
        }`}
      />
      {config.label}
    </span>
  );
}

export default StatusBadge;
