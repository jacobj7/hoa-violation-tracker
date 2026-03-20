"use client";

import { useState } from "react";

interface Violation {
  id: string;
  title: string;
  description: string;
  status: "pending" | "under_review" | "resolved" | "dismissed" | "appealed";
  created_at: string;
  property_address?: string;
  fine_amount?: number;
  appeal_reason?: string;
  appeal_submitted_at?: string;
}

interface OwnerViolationsClientProps {
  violations: Violation[];
}

const STATUS_LABELS: Record<Violation["status"], string> = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
  appealed: "Appealed",
};

const STATUS_COLORS: Record<Violation["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  dismissed: "bg-gray-100 text-gray-800 border-gray-200",
  appealed: "bg-purple-100 text-purple-800 border-purple-200",
};

function StatusBadge({ status }: { status: Violation["status"] }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function AppealForm({
  violationId,
  onSuccess,
}: {
  violationId: string;
  onSuccess: (id: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for your appeal.");
      return;
    }
    if (reason.trim().length < 20) {
      setError("Appeal reason must be at least 20 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/violations/${violationId}/appeal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      onSuccess(violationId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit appeal. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <label
          htmlFor={`appeal-reason-${violationId}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Appeal Reason
        </label>
        <textarea
          id={`appeal-reason-${violationId}`}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          rows={4}
          placeholder="Explain why you are appealing this violation..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          {reason.trim().length} / minimum 20 characters
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !reason.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            "Submit Appeal"
          )}
        </button>
      </div>
    </form>
  );
}

export default function OwnerViolationsClient({
  violations: initialViolations,
}: OwnerViolationsClientProps) {
  const [violations, setViolations] = useState<Violation[]>(initialViolations);
  const [expandedAppeal, setExpandedAppeal] = useState<string | null>(null);
  const [appealedIds, setAppealedIds] = useState<Set<string>>(new Set());

  const canAppeal = (violation: Violation) =>
    violation.status === "pending" || violation.status === "under_review";

  const handleAppealSuccess = (id: string) => {
    setAppealedIds((prev) => new Set(prev).add(id));
    setExpandedAppeal(null);
    setViolations((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: "appealed" as const } : v,
      ),
    );
  };

  const toggleAppealForm = (id: string) => {
    setExpandedAppeal((prev) => (prev === id ? null : id));
  };

  if (violations.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No violations
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          You have no violations on record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {violations.map((violation) => {
        const isAppealExpanded = expandedAppeal === violation.id;
        const justAppealed = appealedIds.has(violation.id);
        const appealable = canAppeal(violation);

        return (
          <div
            key={violation.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {violation.title}
                    </h3>
                    <StatusBadge status={violation.status} />
                  </div>

                  {violation.property_address && (
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="font-medium">Property:</span>{" "}
                      {violation.property_address}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-gray-700">
                    {violation.description}
                  </p>

                  <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-gray-500">
                    <span>
                      Issued:{" "}
                      {new Date(violation.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                    {violation.fine_amount != null && (
                      <span className="font-medium text-red-600">
                        Fine: ${violation.fine_amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {violation.appeal_reason && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-md">
                      <p className="text-xs font-medium text-purple-700 mb-1">
                        Appeal Submitted
                      </p>
                      <p className="text-sm text-purple-900">
                        {violation.appeal_reason}
                      </p>
                      {violation.appeal_submitted_at && (
                        <p className="mt-1 text-xs text-purple-600">
                          Submitted on{" "}
                          {new Date(
                            violation.appeal_submitted_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {justAppealed && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700 font-medium">
                        ✓ Your appeal has been submitted successfully.
                      </p>
                    </div>
                  )}
                </div>

                {appealable && !justAppealed && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => toggleAppealForm(violation.id)}
                      className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isAppealExpanded
                          ? "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                      aria-expanded={isAppealExpanded}
                    >
                      {isAppealExpanded ? "Cancel" : "Appeal"}
                    </button>
                  </div>
                )}
              </div>

              {isAppealExpanded && appealable && !justAppealed && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <AppealForm
                    violationId={violation.id}
                    onSuccess={handleAppealSuccess}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
