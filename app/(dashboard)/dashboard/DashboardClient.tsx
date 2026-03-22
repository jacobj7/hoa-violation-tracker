"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gavel,
  Scale,
} from "lucide-react";

export interface DashboardSummary {
  open: number;
  confirmed: number;
  notice_issued: number;
  fine_applied: number;
  resolved: number;
  appealed: number;
  totalProperties: number;
  violationsThisMonth: number;
}

interface DashboardClientProps {
  summary: DashboardSummary;
}

interface StatusCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export default function DashboardClient({ summary }: DashboardClientProps) {
  const statusCards: StatusCard[] = [
    {
      label: "Open Violations",
      value: summary.open,
      icon: <AlertCircle className="h-5 w-5" />,
      colorClass: "text-red-600",
      bgClass: "bg-red-50 border-red-200",
    },
    {
      label: "Confirmed",
      value: summary.confirmed,
      icon: <AlertTriangle className="h-5 w-5" />,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50 border-orange-200",
    },
    {
      label: "Notice Issued",
      value: summary.notice_issued,
      icon: <FileText className="h-5 w-5" />,
      colorClass: "text-yellow-600",
      bgClass: "bg-yellow-50 border-yellow-200",
    },
    {
      label: "Fine Applied",
      value: summary.fine_applied,
      icon: <Gavel className="h-5 w-5" />,
      colorClass: "text-purple-600",
      bgClass: "bg-purple-50 border-purple-200",
    },
    {
      label: "Resolved",
      value: summary.resolved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      colorClass: "text-green-600",
      bgClass: "bg-green-50 border-green-200",
    },
    {
      label: "Appealed",
      value: summary.appealed,
      icon: <Scale className="h-5 w-5" />,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50 border-blue-200",
    },
  ];

  const summaryCards = [
    {
      label: "Total Properties",
      value: summary.totalProperties,
      icon: <Building2 className="h-5 w-5" />,
      colorClass: "text-slate-600",
      bgClass: "bg-slate-50 border-slate-200",
    },
    {
      label: "Violations This Month",
      value: summary.violationsThisMonth,
      icon: <CalendarDays className="h-5 w-5" />,
      colorClass: "text-indigo-600",
      bgClass: "bg-indigo-50 border-indigo-200",
    },
  ];

  const totalActive =
    summary.open +
    summary.confirmed +
    summary.notice_issued +
    summary.fine_applied +
    summary.appealed;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of property violations and compliance status
        </p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active Violations Summary */}
        <Card className="border-2 border-gray-200 bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Active Violations
            </CardTitle>
            <BadgeCheck className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {totalActive}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Across all active statuses
            </p>
          </CardContent>
        </Card>

        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className={`border-2 shadow-sm ${card.bgClass}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.label}
              </CardTitle>
              <span className={card.colorClass}>{card.icon}</span>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.colorClass}`}>
                {card.value.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {card.label === "Total Properties"
                  ? "Registered in system"
                  : "New violations recorded"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Violation Status Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Violations by Status
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statusCards.map((card) => (
            <Card
              key={card.label}
              className={`border-2 shadow-sm transition-shadow hover:shadow-md ${card.bgClass}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.label}
                </CardTitle>
                <span className={card.colorClass}>{card.icon}</span>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${card.colorClass}`}>
                  {card.value.toLocaleString()}
                </div>
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        card.colorClass === "text-red-600"
                          ? "bg-red-500"
                          : card.colorClass === "text-orange-600"
                            ? "bg-orange-500"
                            : card.colorClass === "text-yellow-600"
                              ? "bg-yellow-500"
                              : card.colorClass === "text-purple-600"
                                ? "bg-purple-500"
                                : card.colorClass === "text-green-600"
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                      }`}
                      style={{
                        width:
                          totalActive > 0
                            ? `${Math.min(100, (card.value / (totalActive + summary.resolved)) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
