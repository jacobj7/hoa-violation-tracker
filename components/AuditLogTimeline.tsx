"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  UserCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  entityType?: string;
  entityId?: string;
}

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
  className?: string;
  showEntityInfo?: boolean;
}

const statusColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  inactive: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  approved: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  completed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  published: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  archived: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
  },
  suspended: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  deleted: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const actionIcons: Record<string, React.ReactNode> = {
  created: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  updated: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
  deleted: <XCircleIcon className="h-5 w-5 text-red-500" />,
  status_changed: <ArrowRightIcon className="h-5 w-5 text-purple-500" />,
  approved: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  rejected: <XCircleIcon className="h-5 w-5 text-red-500" />,
  cancelled: <XCircleIcon className="h-5 w-5 text-orange-500" />,
  completed: <CheckCircleIcon className="h-5 w-5 text-blue-500" />,
  suspended: <ExclamationCircleIcon className="h-5 w-5 text-orange-500" />,
  reactivated: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  archived: <ClockIcon className="h-5 w-5 text-gray-500" />,
};

const actionColors: Record<string, string> = {
  created: "bg-green-100",
  updated: "bg-blue-100",
  deleted: "bg-red-100",
  status_changed: "bg-purple-100",
  approved: "bg-green-100",
  rejected: "bg-red-100",
  cancelled: "bg-orange-100",
  completed: "bg-blue-100",
  suspended: "bg-orange-100",
  reactivated: "bg-green-100",
  archived: "bg-gray-100",
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status.toLowerCase()] ?? {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {status}
    </span>
  );
}

function ActionIcon({ action }: { action: string }) {
  const normalizedAction = action.toLowerCase().replace(/\s+/g, "_");
  const icon = actionIcons[normalizedAction] ?? (
    <InformationCircleIcon className="h-5 w-5 text-gray-500" />
  );
  const bgColor = actionColors[normalizedAction] ?? "bg-gray-100";

  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full ${bgColor} ring-4 ring-white`}
    >
      {icon}
    </div>
  );
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(date: string | Date): {
  relative: string;
  absolute: string;
} {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return {
    relative: formatDistanceToNow(dateObj, { addSuffix: true }),
    absolute: format(dateObj, "MMM d, yyyy HH:mm:ss"),
  };
}

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([key]) => !["id", "userId", "createdAt", "updatedAt"].includes(key),
  );

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 rounded-md bg-gray-50 p-2">
      <dl className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2 text-xs">
            <dt className="font-medium text-gray-500 capitalize">
              {key.replace(/_/g, " ")}:
            </dt>
            <dd className="text-gray-700 break-all">
              {typeof value === "object"
                ? JSON.stringify(value)
                : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuditLogTimeline({
  entries,
  className = "",
  showEntityInfo = false,
}: AuditLogTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      >
        <ClockIcon className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">
          No audit log entries
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Changes to this record will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={`flow-root ${className}`}>
      <ul role="list" className="-mb-8">
        {entries.map((entry, entryIdx) => {
          const { relative, absolute } = formatTimestamp(entry.createdAt);
          const isLast = entryIdx === entries.length - 1;

          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div className="flex-shrink-0">
                    <ActionIcon action={entry.action} />
                  </div>

                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatActionLabel(entry.action)}
                        </span>

                        {showEntityInfo && entry.entityType && (
                          <span className="text-xs text-gray-500">
                            on {entry.entityType}
                            {entry.entityId && (
                              <span className="font-mono ml-1 text-gray-400">
                                #{entry.entityId.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {(entry.oldStatus || entry.newStatus) && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {entry.oldStatus && (
                            <>
                              <StatusBadge status={entry.oldStatus} />
                              <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            </>
                          )}
                          {entry.newStatus && (
                            <StatusBadge status={entry.newStatus} />
                          )}
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <UserCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600">
                          {entry.userName}
                        </span>
                        {entry.userEmail && (
                          <span className="text-xs text-gray-400">
                            ({entry.userEmail})
                          </span>
                        )}
                      </div>

                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 && (
                          <MetadataDisplay metadata={entry.metadata} />
                        )}
                    </div>

                    <div className="flex-shrink-0 whitespace-nowrap text-right">
                      <time
                        dateTime={
                          typeof entry.createdAt === "string"
                            ? entry.createdAt
                            : entry.createdAt.toISOString()
                        }
                        title={absolute}
                        className="text-xs text-gray-500 cursor-help"
                      >
                        {relative}
                      </time>
                      <p className="mt-0.5 text-xs text-gray-400 hidden sm:block">
                        {format(
                          typeof entry.createdAt === "string"
                            ? new Date(entry.createdAt)
                            : entry.createdAt,
                          "MMM d, yyyy",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
