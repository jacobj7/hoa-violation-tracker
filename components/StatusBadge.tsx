const statusConfig = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  "in-review": {
    label: "In Review",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  },
} as const;

export type ViolationStatus = keyof typeof statusConfig;

interface StatusBadgeProps {
  status: ViolationStatus;
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === "open"
            ? "bg-red-500"
            : status === "in-review"
              ? "bg-yellow-500"
              : status === "resolved"
                ? "bg-green-500"
                : "bg-gray-500"
        }`}
      />
      {config.label}
    </span>
  );
}
