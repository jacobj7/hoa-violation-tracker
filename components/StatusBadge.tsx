const STATUS_CONFIG = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  pending: {
    label: "Pending",
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

export type ViolationStatus = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: ViolationStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() as ViolationStatus;
  const config = STATUS_CONFIG[normalizedStatus] ?? {
    label: status ?? "Unknown",
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
