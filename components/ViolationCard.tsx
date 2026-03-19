import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin, Calendar, AlertTriangle } from "lucide-react";

export type ViolationSeverity = "low" | "medium" | "high" | "critical";
export type ViolationStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Violation {
  id: string | number;
  propertyAddress: string;
  category: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  reportedDate: string | Date;
}

interface ViolationCardProps {
  violation: Violation;
}

const severityConfig: Record<
  ViolationSeverity,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

const statusConfig: Record<
  ViolationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-800 border-gray-200",
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

export default function ViolationCard({ violation }: ViolationCardProps) {
  const severity = severityConfig[violation.severity] ?? severityConfig.low;
  const status = statusConfig[violation.status] ?? statusConfig.open;

  return (
    <Link href={`/violations/${violation.id}`} className="block group">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-gray-300 group-hover:bg-gray-50/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <span className="font-semibold text-gray-900 text-sm leading-snug truncate">
                {violation.propertyAddress}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <AlertTriangle
                className={`h-3.5 w-3.5 ${
                  violation.severity === "critical"
                    ? "text-red-500"
                    : violation.severity === "high"
                      ? "text-orange-500"
                      : violation.severity === "medium"
                        ? "text-yellow-500"
                        : "text-blue-500"
                }`}
              />
              <Badge
                variant="outline"
                className={`text-xs font-medium px-2 py-0.5 ${severity.className}`}
              >
                {severity.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-600 font-medium truncate">
                {violation.category}
              </span>
              <Badge
                variant="outline"
                className={`text-xs font-medium px-2 py-0.5 shrink-0 ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Reported {formatDate(violation.reportedDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
