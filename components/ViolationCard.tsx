import Link from "next/link";

interface Violation {
  id: string | number;
  propertyAddress: string;
  category: string;
  date: string | Date;
  status: "open" | "closed" | "pending" | "resolved" | string;
}

interface ViolationCardProps {
  violation: Violation;
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyles(status: string): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "open":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        label: "Open",
      };
    case "pending":
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        label: "Pending",
      };
    case "closed":
      return {
        bg: "bg-gray-50",
        text: "text-gray-600",
        border: "border-gray-200",
        label: "Closed",
      };
    case "resolved":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        label: "Resolved",
      };
    default:
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        label: status.charAt(0).toUpperCase() + status.slice(1),
      };
  }
}

export default function ViolationCard({ violation }: ViolationCardProps) {
  const { id, propertyAddress, category, date, status } = violation;
  const statusStyles = getStatusStyles(status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-5">
        {/* Header row: address + status badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <svg
              className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
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
            <h3 className="text-sm font-semibold text-gray-900 leading-snug truncate">
              {propertyAddress}
            </h3>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                status.toLowerCase() === "open"
                  ? "bg-red-500"
                  : status.toLowerCase() === "pending"
                    ? "bg-yellow-500"
                    : status.toLowerCase() === "resolved"
                      ? "bg-green-500"
                      : status.toLowerCase() === "closed"
                        ? "bg-gray-400"
                        : "bg-blue-500"
              }`}
              aria-hidden="true"
            />
            {statusStyles.label}
          </span>
        </div>

        {/* Category */}
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm text-gray-600">{category}</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
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
          <span className="text-sm text-gray-500">{formatDate(date)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 pt-3">
          <Link
            href={`/violations/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-150 group"
          >
            View Details
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150"
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
          </Link>
        </div>
      </div>
    </div>
  );
}
