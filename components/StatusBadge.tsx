"use client";

import React from "react";

type ViolationStatus = "open" | "in_review" | "resolved";
type FinePaymentStatus = "pending" | "paid" | "overdue" | "waived" | "disputed";
type StatusType = ViolationStatus | FinePaymentStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  type?: "violation" | "fine" | "auto";
  className?: string;
}

const violationStatusConfig: Record<
  ViolationStatus,
  { label: string; classes: string }
> = {
  open: {
    label: "Open",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
  in_review: {
    label: "In Review",
    classes: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
};

const finePaymentStatusConfig: Record<
  FinePaymentStatus,
  { label: string; classes: string }
> = {
  pending: {
    label: "Pending",
    classes: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  paid: {
    label: "Paid",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
  overdue: {
    label: "Overdue",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
  waived: {
    label: "Waived",
    classes: "bg-gray-100 text-gray-700 border border-gray-200",
  },
  disputed: {
    label: "Disputed",
    classes: "bg-purple-100 text-purple-800 border border-purple-200",
  },
};

const defaultConfig = {
  label: "",
  classes: "bg-gray-100 text-gray-700 border border-gray-200",
};

function getStatusConfig(
  status: StatusType,
  type?: "violation" | "fine" | "auto",
): { label: string; classes: string } {
  if (
    type === "violation" ||
    (type === "auto" && status in violationStatusConfig)
  ) {
    const config = violationStatusConfig[status as ViolationStatus];
    if (config) return config;
  }

  if (
    type === "fine" ||
    (type === "auto" && status in finePaymentStatusConfig)
  ) {
    const config = finePaymentStatusConfig[status as FinePaymentStatus];
    if (config) return config;
  }

  if (type === undefined || type === "auto") {
    if (status in violationStatusConfig) {
      return violationStatusConfig[status as ViolationStatus];
    }
    if (status in finePaymentStatusConfig) {
      return finePaymentStatusConfig[status as FinePaymentStatus];
    }
  }

  return {
    ...defaultConfig,
    label: status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
  };
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = "auto",
  className = "",
}) => {
  const config = getStatusConfig(status, type);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.classes} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDotColor(status, type)}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
};

function getDotColor(
  status: StatusType,
  type?: "violation" | "fine" | "auto",
): string {
  const resolvedType =
    type === "auto" || type === undefined ? detectType(status) : type;

  if (resolvedType === "violation") {
    const dotColors: Record<ViolationStatus, string> = {
      open: "bg-red-500",
      in_review: "bg-yellow-500",
      resolved: "bg-green-500",
    };
    return dotColors[status as ViolationStatus] ?? "bg-gray-400";
  }

  if (resolvedType === "fine") {
    const dotColors: Record<FinePaymentStatus, string> = {
      pending: "bg-orange-500",
      paid: "bg-green-500",
      overdue: "bg-red-500",
      waived: "bg-gray-400",
      disputed: "bg-purple-500",
    };
    return dotColors[status as FinePaymentStatus] ?? "bg-gray-400";
  }

  return "bg-gray-400";
}

function detectType(status: StatusType): "violation" | "fine" | "unknown" {
  if (status in violationStatusConfig) return "violation";
  if (status in finePaymentStatusConfig) return "fine";
  return "unknown";
}

export default StatusBadge;
export type {
  ViolationStatus,
  FinePaymentStatus,
  StatusType,
  StatusBadgeProps,
};
