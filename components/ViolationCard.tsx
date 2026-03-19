"use client";

import React from "react";

export type ViolationStatus =
  | "open"
  | "closed"
  | "pending"
  | "appealed"
  | "resolved";

export interface Violation {
  id: string | number;
  propertyAddress: string;
  type: string;
  date: string | Date;
  fine: number;
  status: ViolationStatus;
}

interface ViolationCardProps {
  violation: Violation;
  onClick?: (violation: Violation) => void;
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
  closed: {
    label: "Closed",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",
  },
  appealed: {
    label: "Appealed",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  resolved: {
    label: "Resolved",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
};

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
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

export function ViolationCard({
  violation,
  onClick,
  className = "",
}: ViolationCardProps) {
  const { propertyAddress, type, date, fine, status } = violation;
  const statusStyle = statusConfig[status] ?? statusConfig["open"];

  const handleClick = () => {
    if (onClick) {
      onClick(violation);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(violation);
    }
  };

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm
        transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.99]" : ""}
        ${className}
      `}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View violation at ${propertyAddress}` : undefined}
    >
      <div className="p-5">
        {/* Header: Address + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {propertyAddress}
            </h3>
          </div>

          {/* Status Badge */}
          <span
            className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              border flex-shrink-0
              ${statusStyle.bgColor} ${statusStyle.textColor} ${statusStyle.borderColor}
            `}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                status === "open"
                  ? "bg-red-500"
                  : status === "pending"
                    ? "bg-yellow-500"
                    : status === "appealed"
                      ? "bg-blue-500"
                      : status === "resolved"
                        ? "bg-green-500"
                        : "bg-gray-400"
              }`}
              aria-hidden="true"
            />
            {statusStyle.label}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Violation Type */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Type
            </span>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm text-gray-700 font-medium truncate">
                {type}
              </span>
            </div>
          </div>

          {/* Fine Amount */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Fine
            </span>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                className={`text-sm font-semibold ${
                  fine > 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                {formatCurrency(fine)}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Date Issued
            </span>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-700">{formatDate(date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer action hint */}
      {onClick && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            View details
          </span>
        </div>
      )}
    </div>
  );
}

export default ViolationCard;
