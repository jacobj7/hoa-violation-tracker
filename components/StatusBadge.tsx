const statusConfig: Record<string, { label: string; className: string }> = {
  reported: {
    label: "Reported",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  under_review: {
    label: "Under Review",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
