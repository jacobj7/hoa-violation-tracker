"use client";

import { useState } from "react";

interface Violation {
  id: string;
  status: string;
  cure_deadline: string | null;
  category_name: string;
  property_address: string;
  property_id: string;
  description: string;
}

interface GroupedViolations {
  [propertyId: string]: {
    address: string;
    violations: Violation[];
  };
}

interface OwnerPortalClientProps {
  violations: Violation[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-red-100 text-red-800",
  notice_issued: "bg-orange-100 text-orange-800",
  appealed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

interface AppealModalProps {
  violationId: string;
  onClose: () => void;
  onSuccess: (violationId: string) => void;
}

function AppealModal({ violationId, onClose, onSuccess }: AppealModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for your appeal.");
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
          data.error ?? "Failed to submit appeal. Please try again.",
        );
      }

      onSuccess(violationId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appeal-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="appeal-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Submit Appeal
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
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
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label
              htmlFor="appeal-reason"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Reason for Appeal <span className="text-red-500">*</span>
            </label>
            <textarea
              id="appeal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Please explain why you are appealing this violation..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && (
            <div
              className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Appeal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OwnerPortalClient({
  violations,
}: OwnerPortalClientProps) {
  const [appealingViolationId, setAppealingViolationId] = useState<
    string | null
  >(null);
  const [appealedViolationIds, setAppealedViolationIds] = useState<Set<string>>(
    new Set(),
  );

  const grouped: GroupedViolations = violations.reduce((acc, violation) => {
    if (!acc[violation.property_id]) {
      acc[violation.property_id] = {
        address: violation.property_address,
        violations: [],
      };
    }
    acc[violation.property_id].violations.push(violation);
    return acc;
  }, {} as GroupedViolations);

  const handleAppealSuccess = (violationId: string) => {
    setAppealedViolationIds((prev) => new Set(prev).add(violationId));
  };

  const canAppeal = (violation: Violation) => {
    if (appealedViolationIds.has(violation.id)) return false;
    return (
      violation.status === "confirmed" || violation.status === "notice_issued"
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="mb-4 h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">
          No violations found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          You have no violations associated with your properties.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {Object.entries(grouped).map(
          ([propertyId, { address, violations: propertyViolations }]) => (
            <section
              key={propertyId}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {address}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {propertyViolations.length} violation
                  {propertyViolations.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {propertyViolations.map((violation) => (
                  <div key={violation.id} className="px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {violation.category_name}
                          </span>
                          <StatusBadge
                            status={
                              appealedViolationIds.has(violation.id)
                                ? "appealed"
                                : violation.status
                            }
                          />
                        </div>

                        {violation.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {violation.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>
                            <span className="font-medium">Cure Deadline:</span>{" "}
                            {formatDate(violation.cure_deadline)}
                          </span>
                          <span>
                            <span className="font-medium">ID:</span>{" "}
                            <span className="font-mono">
                              {violation.id.slice(0, 8)}…
                            </span>
                          </span>
                        </div>
                      </div>

                      {canAppeal(violation) && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={() =>
                              setAppealingViolationId(violation.id)
                            }
                            className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            Submit Appeal
                          </button>
                        </div>
                      )}

                      {appealedViolationIds.has(violation.id) && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Appeal Submitted
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ),
        )}
      </div>

      {appealingViolationId && (
        <AppealModal
          violationId={appealingViolationId}
          onClose={() => setAppealingViolationId(null)}
          onSuccess={handleAppealSuccess}
        />
      )}
    </>
  );
}
