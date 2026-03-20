const STATUS_CONFIG = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  notice_sent: {
    label: "Notice Sent",
    className: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  appealed: {
    label: "Appealed",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  hearing_scheduled: {
    label: "Hearing Scheduled",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
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

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as ViolationStatus];

  if (!config) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
