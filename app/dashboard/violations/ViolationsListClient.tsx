"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type ViolationStatus = "open" | "in-review" | "resolved";

interface Violation {
  id: string;
  propertyAddress: string;
  category: string;
  description: string;
  status: ViolationStatus;
  createdAt: string;
  updatedAt: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ViolationsListClientProps {
  violations: Violation[];
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in-review", label: "In Review" },
  { key: "resolved", label: "Resolved" },
] as const;

type TabKey = (typeof STATUS_TABS)[number]["key"];

const STATUS_BADGE_STYLES: Record<ViolationStatus, string> = {
  open: "bg-red-100 text-red-800 border border-red-200",
  "in-review": "bg-yellow-100 text-yellow-800 border border-yellow-200",
  resolved: "bg-green-100 text-green-800 border border-green-200",
};

const STATUS_LABELS: Record<ViolationStatus, string> = {
  open: "Open",
  "in-review": "In Review",
  resolved: "Resolved",
};

const SEVERITY_BADGE_STYLES: Record<Violation["severity"], string> = {
  low: "bg-blue-50 text-blue-700 border border-blue-200",
  medium: "bg-orange-50 text-orange-700 border border-orange-200",
  high: "bg-red-50 text-red-700 border border-red-200",
  critical: "bg-purple-100 text-purple-800 border border-purple-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Building Code": "🏗️",
  "Fire Safety": "🔥",
  Electrical: "⚡",
  Plumbing: "🔧",
  Structural: "🏛️",
  Zoning: "📋",
  Environmental: "🌿",
  "Health & Safety": "🛡️",
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "📌";
}

function ViolationCard({ violation }: { violation: Violation }) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(violation.createdAt), {
        addSuffix: true,
      });
    } catch {
      return "Unknown date";
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
              {getCategoryIcon(violation.category)}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {violation.propertyAddress}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {violation.category}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[violation.status]}`}
            >
              {STATUS_LABELS[violation.status]}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${SEVERITY_BADGE_STYLES[violation.severity]}`}
            >
              {violation.severity}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <p
            className={`text-sm text-gray-600 leading-relaxed ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {violation.description}
          </p>
          {violation.description.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 font-medium transition-colors"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">Reported {timeAgo}</span>
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors font-medium"
              onClick={() => {
                // Navigate to detail page
                window.location.href = `/dashboard/violations/${violation.id}`;
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: TabKey }) {
  const messages: Record<TabKey, { title: string; description: string }> = {
    all: {
      title: "No violations found",
      description: "There are no violations recorded in the system.",
    },
    open: {
      title: "No open violations",
      description: "All violations have been addressed or are under review.",
    },
    "in-review": {
      title: "No violations in review",
      description: "There are currently no violations being reviewed.",
    },
    resolved: {
      title: "No resolved violations",
      description: "No violations have been resolved yet.",
    },
  };

  const { title, description } = messages[activeTab];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl" aria-hidden="true">
          📋
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{description}</p>
    </div>
  );
}

export default function ViolationsListClient({
  violations,
}: ViolationsListClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredViolations = violations.filter((v) => {
    const matchesTab = activeTab === "all" || v.status === activeTab;
    const matchesSearch =
      searchQuery === "" ||
      v.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const countByStatus = (status: ViolationStatus) =>
    violations.filter((v) => v.status === status).length;

  const tabCounts: Record<TabKey, number> = {
    all: violations.length,
    open: countByStatus("open"),
    "in-review": countByStatus("in-review"),
    resolved: countByStatus("resolved"),
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by address, category, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-1"
          aria-label="Violation status tabs"
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap
                  ${
                    isActive
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-600"
                    }
                  `}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Results summary */}
      {searchQuery && (
        <p className="text-sm text-gray-500">
          {filteredViolations.length === 0
            ? "No results found"
            : `Showing ${filteredViolations.length} result${filteredViolations.length !== 1 ? "s" : ""} for "${searchQuery}"`}
        </p>
      )}

      {/* Violations Grid */}
      {filteredViolations.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredViolations.map((violation) => (
            <ViolationCard key={violation.id} violation={violation} />
          ))}
        </div>
      )}
    </div>
  );
}
