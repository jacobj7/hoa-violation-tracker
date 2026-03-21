"use client";

import { useState } from "react";
import { z } from "zod";

const ViolationSchema = z.object({
  id: z.string(),
  property_address: z.string(),
  violation_type: z.string(),
  description: z.string(),
  status: z.string(),
  created_at: z.string(),
  fine_amount: z.number().nullable(),
});

const NoticeSchema = z.object({
  id: z.string(),
  violation_id: z.string(),
  notice_type: z.string(),
  sent_at: z.string(),
  content: z.string(),
});

const DisputeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  supporting_details: z
    .string()
    .min(20, "Please provide more details (at least 20 characters)"),
});

type Violation = z.infer<typeof ViolationSchema>;
type Notice = z.infer<typeof NoticeSchema>;
type DisputeForm = z.infer<typeof DisputeSchema>;

interface PageClientProps {
  violations?: Violation[];
  notices?: Notice[];
  ownerName?: string;
}

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  disputed: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

export default function PageClient({
  violations,
  notices,
  ownerName,
}: PageClientProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(
    null,
  );
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [expandedViolation, setExpandedViolation] = useState<string | null>(
    null,
  );
  const [disputeForm, setDisputeForm] = useState<DisputeForm>({
    reason: "",
    supporting_details: "",
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof DisputeForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getNoticesForViolation = (violationId: string) =>
    notices.filter((n) => n.violation_id === violationId);

  const handleOpenDispute = (violation: Violation) => {
    setSelectedViolation(violation);
    setDisputeForm({ reason: "", supporting_details: "" });
    setFormErrors({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setShowDisputeModal(true);
  };

  const handleCloseModal = () => {
    setShowDisputeModal(false);
    setSelectedViolation(null);
  };

  const validateForm = (): boolean => {
    const result = DisputeSchema.safeParse(disputeForm);
    if (!result.success) {
      const errors: Partial<Record<keyof DisputeForm, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof DisputeForm;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViolation) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          violation_id: selectedViolation.id,
          reason: disputeForm.reason,
          supporting_details: disputeForm.supporting_details,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit dispute");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        handleCloseModal();
      }, 2000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleViolationExpand = (id: string) => {
    setExpandedViolation(expandedViolation === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner Portal</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {ownerName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {violations.length} violation
                {violations.length !== 1 ? "s" : ""}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {violations.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Violations Found
            </h2>
            <p className="text-gray-500">
              Your properties are in good standing. Keep up the great work!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Your Violations
            </h2>
            {violations.map((violation) => {
              const violationNotices = getNoticesForViolation(violation.id);
              const isExpanded = expandedViolation === violation.id;
              const statusClass =
                statusColors[violation.status] || "bg-gray-100 text-gray-800";

              return (
                <div
                  key={violation.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Violation Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                          >
                            {violation.status.charAt(0).toUpperCase() +
                              violation.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(violation.created_at)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {violation.property_address}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Type:</span>{" "}
                          {violation.violation_type}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {violation.description}
                        </p>
                        {violation.fine_amount !== null && (
                          <p className="text-sm font-medium text-red-600 mt-2">
                            Fine: {formatCurrency(violation.fine_amount)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {violation.status === "open" ||
                        violation.status === "pending" ? (
                          <button
                            onClick={() => handleOpenDispute(violation)}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Dispute
                          </button>
                        ) : null}
                        {violationNotices.length > 0 && (
                          <button
                            onClick={() => toggleViolationExpand(violation.id)}
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {isExpanded ? "Hide" : "View"} notices (
                            {violationNotices.length})
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notice History */}
                  {isExpanded && violationNotices.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Notice History
                      </h4>
                      <div className="space-y-3">
                        {violationNotices.map((notice) => (
                          <div
                            key={notice.id}
                            className="bg-white rounded-md border border-gray-200 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-800">
                                {notice.notice_type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(notice.sent_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {notice.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Dispute Modal */}
      {showDisputeModal && selectedViolation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Submit Dispute
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedViolation.property_address}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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

              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Dispute Submitted
                  </h3>
                  <p className="text-sm text-gray-500">
                    Your dispute has been received. We will review it and get
                    back to you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitDispute} noValidate>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="reason"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Reason for Dispute{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reason"
                        type="text"
                        value={disputeForm.reason}
                        onChange={(e) =>
                          setDisputeForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="Brief reason for your dispute"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.reason
                            ? "border-red-400"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.reason && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.reason}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="supporting_details"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Supporting Details{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="supporting_details"
                        rows={5}
                        value={disputeForm.supporting_details}
                        onChange={(e) =>
                          setDisputeForm((prev) => ({
                            ...prev,
                            supporting_details: e.target.value,
                          }))
                        }
                        placeholder="Provide detailed information supporting your dispute, including any relevant dates, events, or evidence."
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                          formErrors.supporting_details
                            ? "border-red-400"
                            : "border-gray-300"
                        }`}
                      />
                      {formErrors.supporting_details && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.supporting_details}
                        </p>
                      )}
                    </div>

                    {submitError && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-700">{submitError}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? "Submitting..." : "Submit Dispute"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
