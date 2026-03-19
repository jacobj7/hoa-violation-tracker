"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow, format } from "date-fns";

type AuditEntry = {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
};

type Violation = {
  id: string;
  property_id: string;
  property_address: string;
  property_unit: string | null;
  owner_name: string;
  owner_email: string;
  violation_type: string;
  description: string;
  fine_amount: number;
  status: "pending" | "under_review" | "resolved" | "dismissed" | "appealed";
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  audit_log: AuditEntry[];
};

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    value: "under_review",
    label: "Under Review",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "resolved",
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "dismissed",
    label: "Dismissed",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  {
    value: "appealed",
    label: "Appealed",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
];

function StatusBadge({ status }: { status: string }) {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
        option?.color ?? "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      {option?.label ?? status}
    </span>
  );
}

function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No audit history available.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {entries.map((entry, idx) => (
        <li key={entry.id} className="mb-6 ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-white border-2 border-blue-500 rounded-full">
            <svg
              className="w-3 h-3 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {entry.action}
              </span>
              <time className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(entry.created_at), {
                  addSuffix: true,
                })}
              </time>
            </div>
            {entry.old_status && entry.new_status && (
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={entry.old_status} />
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <StatusBadge status={entry.new_status} />
              </div>
            )}
            {entry.notes && (
              <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              By {entry.performed_by_name}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ViolationDetail({
  violation: initialViolation,
}: {
  violation: Violation;
}) {
  const [violation, setViolation] = useState<Violation>(initialViolation);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialViolation.status,
  );
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const hasStatusChanged = selectedStatus !== violation.status;

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!hasStatusChanged) return;

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const res = await fetch(`/api/violations/${violation.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          notes: statusNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Request failed with status ${res.status}`,
        );
      }

      const updated: Violation = await res.json();
      setViolation(updated);
      setSelectedStatus(updated.status);
      setStatusNotes("");
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err: unknown) {
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Violation #{violation.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reported {format(new Date(violation.created_at), "PPP")}
            {violation.due_date && (
              <> · Due {format(new Date(violation.due_date), "PPP")}</>
            )}
          </p>
        </div>
        <StatusBadge status={violation.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Info */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Property Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {violation.property_address}
                  {violation.property_unit && (
                    <span className="text-gray-500">
                      {" "}
                      · Unit {violation.property_unit}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Property ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {violation.property_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Owner
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {violation.owner_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Owner Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`mailto:${violation.owner_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {violation.owner_email}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          {/* Violation Details */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Violation Details
            </h2>
            <dl className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Violation Type
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">
                    {violation.violation_type}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Fine Amount
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold text-red-600">
                    ${violation.fine_amount.toFixed(2)}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900 leading-relaxed">
                  {violation.description}
                </dd>
              </div>
              {violation.notes && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">
                    {violation.notes}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Photo */}
          {violation.photo_url && (
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Evidence Photo
              </h2>
              <button
                onClick={() => setPhotoModalOpen(true)}
                className="block w-full rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="relative w-full h-64">
                  <Image
                    src={violation.photo_url}
                    alt="Violation evidence"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
                <p className="text-xs text-center text-gray-500 py-2 bg-gray-50">
                  Click to enlarge
                </p>
              </button>
            </section>
          )}

          {/* Audit Log */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Audit Log
            </h2>
            <AuditTimeline entries={violation.audit_log} />
          </section>
        </div>

        {/* Right column — Status Update */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Update Status
              </h2>

              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    New Status
                  </label>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStatus === option.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={selectedStatus === option.value}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className={`text-sm font-medium px-2 py-0.5 rounded-full border ${option.color}`}
                        >
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="status-notes"
                    className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id="status-notes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    placeholder="Add a note about this status change..."
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-400"
                  />
                </div>

                {updateError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <svg
                      className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{updateError}</p>
                  </div>
                )}

                {updateSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-green-700 font-medium">
                      Status updated successfully!
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!hasStatusChanged || isUpdating}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
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
                      Updating...
                    </span>
                  ) : (
                    "Update Status"
                  )}
                </button>

                {!hasStatusChanged && (
                  <p className="text-xs text-center text-gray-400">
                    Select a different status to enable update
                  </p>
                )}
              </form>
            </section>

            {/* Quick Info Card */}
            <section className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Quick Info
              </h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>
                    {format(new Date(violation.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span>
                    {format(new Date(violation.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
                {violation.due_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date</span>
                    <span
                      className={
                        new Date(violation.due_date) < new Date() &&
                        violation.status !== "resolved"
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {format(new Date(violation.due_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Fine</span>
                  <span className="font-semibold text-red-600">
                    ${violation.fine_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Audit Entries</span>
                  <span>{violation.audit_log?.length ?? 0}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {photoModalOpen && violation.photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-3 right-3 z-10 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
              aria-label="Close photo"
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
            <div className="relative w-full h-[80vh]">
              <Image
                src={violation.photo_url}
                alt="Violation evidence - full size"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
