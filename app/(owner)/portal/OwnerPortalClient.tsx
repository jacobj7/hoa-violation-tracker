"use client";

import { useState, useEffect } from "react";

interface Violation {
  id: string;
  property_address: string;
  violation_type: string;
  description: string;
  status: "pending" | "under_review" | "resolved" | "appealed";
  created_at: string;
  appeal?: {
    id: string;
    reason: string;
    submitted_at: string;
    status: string;
  };
}

interface AppealFormState {
  reason: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  appealed: "Appealed",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  appealed: "bg-purple-100 text-purple-800",
};

export default function OwnerPortalClient() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAppealForms, setOpenAppealForms] = useState<
    Record<string, boolean>
  >({});
  const [appealForms, setAppealForms] = useState<
    Record<string, AppealFormState>
  >({});

  useEffect(() => {
    fetchViolations();
  }, []);

  async function fetchViolations() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/owner/violations");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load violations");
      }
      const data = await res.json();
      setViolations(data.violations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function toggleAppealForm(violationId: string) {
    setOpenAppealForms((prev) => ({
      ...prev,
      [violationId]: !prev[violationId],
    }));
    if (!appealForms[violationId]) {
      setAppealForms((prev) => ({
        ...prev,
        [violationId]: {
          reason: "",
          submitting: false,
          error: null,
          success: false,
        },
      }));
    }
  }

  function updateAppealReason(violationId: string, reason: string) {
    setAppealForms((prev) => ({
      ...prev,
      [violationId]: {
        ...prev[violationId],
        reason,
        error: null,
      },
    }));
  }

  async function submitAppeal(violationId: string) {
    const form = appealForms[violationId];
    if (!form) return;

    if (!form.reason.trim()) {
      setAppealForms((prev) => ({
        ...prev,
        [violationId]: {
          ...prev[violationId],
          error: "Please provide a reason for your appeal.",
        },
      }));
      return;
    }

    setAppealForms((prev) => ({
      ...prev,
      [violationId]: {
        ...prev[violationId],
        submitting: true,
        error: null,
      },
    }));

    try {
      const res = await fetch(`/api/violations/${violationId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: form.reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit appeal");
      }

      setAppealForms((prev) => ({
        ...prev,
        [violationId]: {
          ...prev[violationId],
          submitting: false,
          success: true,
        },
      }));

      setViolations((prev) =>
        prev.map((v) =>
          v.id === violationId ? { ...v, status: "appealed" } : v,
        ),
      );

      setTimeout(() => {
        setOpenAppealForms((prev) => ({ ...prev, [violationId]: false }));
      }, 2000);
    } catch (err: unknown) {
      setAppealForms((prev) => ({
        ...prev,
        [violationId]: {
          ...prev[violationId],
          submitting: false,
          error: err instanceof Error ? err.message : "Failed to submit appeal",
        },
      }));
    }
  }

  function canAppeal(violation: Violation): boolean {
    return (
      violation.status === "pending" || violation.status === "under_review"
    );
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading violations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Violations
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchViolations}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Portal</h1>
          <p className="mt-2 text-gray-600">
            View and manage violations for your property
          </p>
        </div>

        {violations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Violations Found
            </h2>
            <p className="text-gray-600">
              Your property has no recorded violations at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {violations.length} violation{violations.length !== 1 ? "s" : ""}{" "}
              found
            </p>

            {violations.map((violation) => {
              const isAppealOpen = openAppealForms[violation.id] || false;
              const appealForm = appealForms[violation.id];
              const appealable = canAppeal(violation);

              return (
                <div
                  key={violation.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {violation.violation_type}
                          </h2>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[violation.status] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {STATUS_LABELS[violation.status] ||
                              violation.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mb-1">
                          📍 {violation.property_address}
                        </p>
                        <p className="text-sm text-gray-500 mb-3">
                          📅 Reported on {formatDate(violation.created_at)}
                        </p>

                        <p className="text-gray-700 text-sm leading-relaxed">
                          {violation.description}
                        </p>

                        {violation.appeal && (
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs font-medium text-purple-700 mb-1">
                              Appeal Submitted —{" "}
                              {formatDate(violation.appeal.submitted_at)}
                            </p>
                            <p className="text-sm text-purple-800">
                              {violation.appeal.reason}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              Appeal status: {violation.appeal.status}
                            </p>
                          </div>
                        )}
                      </div>

                      {appealable && !violation.appeal && (
                        <button
                          onClick={() => toggleAppealForm(violation.id)}
                          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isAppealOpen
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isAppealOpen ? "Cancel" : "Appeal"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isAppealOpen && appealForm && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <h3 className="text-base font-semibold text-gray-800 mb-4">
                        Submit an Appeal
                      </h3>

                      {appealForm.success ? (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <span className="text-green-500 text-xl">✅</span>
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Appeal submitted successfully!
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">
                              We will review your appeal and get back to you.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor={`appeal-reason-${violation.id}`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Reason for Appeal{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              id={`appeal-reason-${violation.id}`}
                              rows={4}
                              value={appealForm.reason}
                              onChange={(e) =>
                                updateAppealReason(violation.id, e.target.value)
                              }
                              placeholder="Please explain why you are appealing this violation. Include any relevant details, evidence, or circumstances that support your case."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              disabled={appealForm.submitting}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {appealForm.reason.length} characters
                            </p>
                          </div>

                          {appealForm.error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700">
                                {appealForm.error}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => submitAppeal(violation.id)}
                              disabled={
                                appealForm.submitting ||
                                !appealForm.reason.trim()
                              }
                              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                              {appealForm.submitting ? (
                                <>
                                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                                  Submitting...
                                </>
                              ) : (
                                "Submit Appeal"
                              )}
                            </button>
                            <button
                              onClick={() => toggleAppealForm(violation.id)}
                              disabled={appealForm.submitting}
                              className="px-5 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
