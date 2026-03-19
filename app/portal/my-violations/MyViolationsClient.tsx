"use client";

import { useState } from "react";
import { z } from "zod";

interface Violation {
  id: string;
  violation_type: string;
  description: string;
  status: "pending" | "under_review" | "resolved" | "appealed" | "dismissed";
  fine_amount: number | null;
  fine_paid: boolean;
  created_at: string;
  resolved_at: string | null;
  property_address: string;
  unit_number: string | null;
  appeal_submitted: boolean;
  appeal_reason: string | null;
  appeal_status: string | null;
}

interface MyViolationsClientProps {
  violations: Violation[];
}

const appealSchema = z.object({
  reason: z
    .string()
    .min(20, "Appeal reason must be at least 20 characters")
    .max(2000, "Appeal reason must be under 2000 characters"),
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  appealed: "bg-purple-100 text-purple-800 border-purple-200",
  dismissed: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  appealed: "Appealed",
  dismissed: "Dismissed",
};

function AppealModal({
  violation,
  onClose,
  onSuccess,
}: {
  violation: Violation;
  onClose: () => void;
  onSuccess: (violationId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ reason?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = appealSchema.safeParse({ reason });
    if (!result.success) {
      const fieldErrors: { reason?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "reason") {
          fieldErrors.reason = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch(`/api/violations/${violation.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit appeal");
      }

      onSuccess(violation.id);
      onClose();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Submit Appeal</h2>
          <p className="mt-1 text-sm text-gray-500">
            Violation: {violation.violation_type}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {serverError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Violation Details
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {violation.description}
            </p>
            {violation.fine_amount && (
              <p className="mt-2 text-sm text-gray-600">
                Fine Amount:{" "}
                <span className="font-semibold text-red-600">
                  ${violation.fine_amount.toFixed(2)}
                </span>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Appeal Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              placeholder="Please provide a detailed explanation for your appeal. Include any relevant facts, circumstances, or evidence that supports your case..."
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reason
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-white"
              }`}
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/2000 characters
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Appeal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViolationCard({
  violation,
  onAppeal,
}: {
  violation: Violation;
  onAppeal: (violation: Violation) => void;
}) {
  const canAppeal =
    !violation.appeal_submitted &&
    (violation.status === "pending" || violation.status === "under_review");

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {violation.violation_type}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {violation.property_address}
              {violation.unit_number && ` · Unit ${violation.unit_number}`}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              statusColors[violation.status] ||
              "bg-gray-100 text-gray-800 border-gray-200"
            }`}
          >
            {statusLabels[violation.status] || violation.status}
          </span>
        </div>
      </div>

      <div className="px-6 py-4">
        <p className="text-sm text-gray-700">{violation.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Reported
            </p>
            <p className="mt-0.5 text-sm text-gray-900">
              {new Date(violation.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {violation.fine_amount !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Fine
              </p>
              <p
                className={`mt-0.5 text-sm font-semibold ${violation.fine_paid ? "text-green-600" : "text-red-600"}`}
              >
                ${violation.fine_amount.toFixed(2)}
                {violation.fine_paid && (
                  <span className="ml-1 text-xs font-normal text-green-600">
                    (Paid)
                  </span>
                )}
              </p>
            </div>
          )}

          {violation.resolved_at && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Resolved
              </p>
              <p className="mt-0.5 text-sm text-gray-900">
                {new Date(violation.resolved_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {violation.appeal_submitted && (
          <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-purple-800">
                Appeal Submitted
              </p>
            </div>
            {violation.appeal_status && (
              <p className="mt-1 text-xs text-purple-700">
                Status:{" "}
                <span className="font-medium capitalize">
                  {violation.appeal_status}
                </span>
              </p>
            )}
            {violation.appeal_reason && (
              <p className="mt-2 text-xs text-purple-700 line-clamp-2">
                {violation.appeal_reason}
              </p>
            )}
          </div>
        )}

        {canAppeal && (
          <div className="mt-4">
            <button
              onClick={() => onAppeal(violation)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
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
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Submit Appeal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyViolationsClient({
  violations: initialViolations,
}: MyViolationsClientProps) {
  const [violations, setViolations] = useState<Violation[]>(initialViolations);
  const [appealTarget, setAppealTarget] = useState<Violation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAppealSuccess = (violationId: string) => {
    setViolations((prev) =>
      prev.map((v) =>
        v.id === violationId
          ? { ...v, appeal_submitted: true, status: "appealed" as const }
          : v,
      ),
    );
    setSuccessMessage(
      "Your appeal has been submitted successfully. We will review it and get back to you.",
    );
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  const filteredViolations = violations.filter((v) => {
    if (filterStatus === "all") return true;
    return v.status === filterStatus;
  });

  const totalFinesOwed = violations
    .filter((v) => v.fine_amount !== null && !v.fine_paid)
    .reduce((sum, v) => sum + (v.fine_amount || 0), 0);

  const totalFinesPaid = violations
    .filter((v) => v.fine_amount !== null && v.fine_paid)
    .reduce((sum, v) => sum + (v.fine_amount || 0), 0);

  const statusCounts = violations.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Violations</h1>
          <p className="mt-2 text-gray-600">
            View and manage your property violations and appeals
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Violations
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {violations.length}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-red-600">Fines Owed</p>
            <p className="mt-1 text-3xl font-bold text-red-700">
              ${totalFinesOwed.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-green-600">Fines Paid</p>
            <p className="mt-1 text-3xl font-bold text-green-700">
              ${totalFinesPaid.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All ({violations.length})
          </button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filterStatus === status
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {statusLabels[status] || status} ({count})
            </button>
          ))}
        </div>

        {/* Violations List */}
        {filteredViolations.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
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
            <p className="mt-4 text-lg font-medium text-gray-900">
              {filterStatus === "all"
                ? "No violations found"
                : `No ${statusLabels[filterStatus] || filterStatus} violations`}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === "all"
                ? "You have no violations on record."
                : "Try selecting a different filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredViolations.map((violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                onAppeal={setAppealTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      {appealTarget && (
        <AppealModal
          violation={appealTarget}
          onClose={() => setAppealTarget(null)}
          onSuccess={handleAppealSuccess}
        />
      )}
    </div>
  );
}
