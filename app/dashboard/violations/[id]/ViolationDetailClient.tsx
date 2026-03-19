"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ViolationStatus =
  | "open"
  | "notified"
  | "hearing_scheduled"
  | "resolved"
  | "closed";

interface Evidence {
  id: string;
  url: string;
  caption: string | null;
  uploaded_at: string;
}

interface Fine {
  id: string;
  amount: number;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  status: string;
}

interface Hearing {
  id: string;
  scheduled_at: string;
  location: string | null;
  notes: string | null;
  outcome: string | null;
}

interface Appeal {
  id: string;
  submitted_at: string;
  reason: string;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
}

interface Violation {
  id: string;
  violation_type: string;
  description: string;
  status: ViolationStatus;
  reported_at: string;
  address: string;
  owner_name: string | null;
  owner_email: string | null;
  officer_name: string | null;
  evidence: Evidence[];
  fines: Fine[];
  hearings: Hearing[];
  appeals: Appeal[];
}

interface Props {
  violation: Violation;
}

const STATUS_ORDER: ViolationStatus[] = [
  "open",
  "notified",
  "hearing_scheduled",
  "resolved",
  "closed",
];

const STATUS_LABELS: Record<ViolationStatus, string> = {
  open: "Open",
  notified: "Notified",
  hearing_scheduled: "Hearing Scheduled",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLORS: Record<ViolationStatus, string> = {
  open: "bg-red-100 text-red-800",
  notified: "bg-yellow-100 text-yellow-800",
  hearing_scheduled: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

function getNextStatuses(current: ViolationStatus): ViolationStatus[] {
  if (current === "open") return ["notified"];
  if (current === "notified") return ["hearing_scheduled", "resolved"];
  if (current === "hearing_scheduled") return ["resolved", "closed"];
  return [];
}

export default function ViolationDetailClient({
  violation: initialViolation,
}: Props) {
  const router = useRouter();
  const [violation, setViolation] = useState<Violation>(initialViolation);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Fine form state
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineAmount, setFineAmount] = useState("");
  const [fineDueDate, setFineDueDate] = useState("");
  const [fineLoading, setFineLoading] = useState(false);
  const [fineError, setFineError] = useState("");
  const [fineSuccess, setFineSuccess] = useState("");

  // Hearing form state
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [hearingDate, setHearingDate] = useState("");
  const [hearingLocation, setHearingLocation] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");
  const [hearingLoading, setHearingLoading] = useState(false);
  const [hearingError, setHearingError] = useState("");
  const [hearingSuccess, setHearingSuccess] = useState("");

  const [selectedImage, setSelectedImage] = useState<Evidence | null>(null);

  const nextStatuses = getNextStatuses(violation.status);

  async function handleStatusTransition(newStatus: ViolationStatus) {
    setStatusLoading(true);
    setStatusError("");
    try {
      const res = await fetch(`/api/violations/${violation.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      const data = await res.json();
      setViolation((prev) => ({ ...prev, status: data.status }));
      router.refresh();
    } catch (err: unknown) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleFineSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFineLoading(true);
    setFineError("");
    setFineSuccess("");
    try {
      const res = await fetch(`/api/violations/${violation.id}/fines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(fineAmount),
          due_date: fineDueDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to issue fine");
      }
      const data = await res.json();
      setViolation((prev) => ({ ...prev, fines: [...prev.fines, data.fine] }));
      setFineSuccess("Fine issued successfully");
      setFineAmount("");
      setFineDueDate("");
      setShowFineForm(false);
    } catch (err: unknown) {
      setFineError(err instanceof Error ? err.message : "Failed to issue fine");
    } finally {
      setFineLoading(false);
    }
  }

  async function handleHearingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHearingLoading(true);
    setHearingError("");
    setHearingSuccess("");
    try {
      const res = await fetch(`/api/violations/${violation.id}/hearings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: hearingDate,
          location: hearingLocation || null,
          notes: hearingNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule hearing");
      }
      const data = await res.json();
      setViolation((prev) => ({
        ...prev,
        hearings: [...prev.hearings, data.hearing],
      }));
      setHearingSuccess("Hearing scheduled successfully");
      setHearingDate("");
      setHearingLocation("");
      setHearingNotes("");
      setShowHearingForm(false);
    } catch (err: unknown) {
      setHearingError(
        err instanceof Error ? err.message : "Failed to schedule hearing",
      );
    } finally {
      setHearingLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline mb-2 inline-flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Violation #{violation.id.slice(0, 8)}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Reported {new Date(violation.reported_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[violation.status]}`}
        >
          {STATUS_LABELS[violation.status]}
        </span>
      </div>

      {/* Status Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Status Progress
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  s === violation.status
                    ? STATUS_COLORS[s]
                    : STATUS_ORDER.indexOf(s) <
                        STATUS_ORDER.indexOf(violation.status)
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-50 text-gray-400 border border-gray-200"
                }`}
              >
                {STATUS_LABELS[s]}
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <span className="text-gray-300">→</span>
              )}
            </div>
          ))}
        </div>

        {nextStatuses.length > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">Transition to:</span>
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusTransition(s)}
                disabled={statusLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {statusLoading ? "Updating..." : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
        {statusError && (
          <p className="mt-2 text-sm text-red-600">{statusError}</p>
        )}
      </div>

      {/* Violation Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Violation Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Type
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {violation.violation_type}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Address
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{violation.address}</dd>
          </div>
          {violation.owner_name && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Owner
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {violation.owner_name}
              </dd>
            </div>
          )}
          {violation.owner_email && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Owner Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {violation.owner_email}
              </dd>
            </div>
          )}
          {violation.officer_name && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assigned Officer
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {violation.officer_name}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Description
            </dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {violation.description}
            </dd>
          </div>
        </dl>
      </div>

      {/* Evidence Photos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Evidence Photos ({violation.evidence.length})
        </h2>
        {violation.evidence.length === 0 ? (
          <p className="text-sm text-gray-500">No evidence photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {violation.evidence.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedImage(ev)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
              >
                <img
                  src={ev.url}
                  alt={ev.caption || "Evidence photo"}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
                {ev.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                    {ev.caption}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-lg overflow-hidden max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium text-gray-900">
                {selectedImage.caption || "Evidence Photo"}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || "Evidence photo"}
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="p-4 text-xs text-gray-500">
              Uploaded {new Date(selectedImage.uploaded_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Fines */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Fines ({violation.fines.length})
          </h2>
          <button
            onClick={() => setShowFineForm(!showFineForm)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            {showFineForm ? "Cancel" : "Issue Fine"}
          </button>
        </div>

        {showFineForm && (
          <form
            onSubmit={handleFineSubmit}
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4"
          >
            <h3 className="font-medium text-gray-800">Issue New Fine</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={fineDueDate}
                  onChange={(e) => setFineDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {fineError && <p className="text-sm text-red-600">{fineError}</p>}
            <button
              type="submit"
              disabled={fineLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {fineLoading ? "Issuing..." : "Issue Fine"}
            </button>
          </form>
        )}

        {fineSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {fineSuccess}
          </div>
        )}

        {violation.fines.length === 0 ? (
          <p className="text-sm text-gray-500">No fines issued.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Issued
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {violation.fines.map((fine) => (
                  <tr
                    key={fine.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 font-medium">
                      ${fine.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(fine.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {fine.due_date
                        ? new Date(fine.due_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          fine.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : fine.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {fine.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {fine.paid_at
                        ? new Date(fine.paid_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hearings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Hearings ({violation.hearings.length})
          </h2>
          <button
            onClick={() => setShowHearingForm(!showHearingForm)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            {showHearingForm ? "Cancel" : "Schedule Hearing"}
          </button>
        </div>

        {showHearingForm && (
          <form
            onSubmit={handleHearingSubmit}
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4"
          >
            <h3 className="font-medium text-gray-800">Schedule New Hearing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={hearingLocation}
                  onChange={(e) => setHearingLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Room 101, City Hall"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={hearingNotes}
                  onChange={(e) => setHearingNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            {hearingError && (
              <p className="text-sm text-red-600">{hearingError}</p>
            )}
            <button
              type="submit"
              disabled={hearingLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {hearingLoading ? "Scheduling..." : "Schedule Hearing"}
            </button>
          </form>
        )}

        {hearingSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {hearingSuccess}
          </div>
        )}

        {violation.hearings.length === 0 ? (
          <p className="text-sm text-gray-500">No hearings scheduled.</p>
        ) : (
          <div className="space-y-3">
            {violation.hearings.map((hearing) => (
              <div
                key={hearing.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(hearing.scheduled_at).toLocaleString()}
                    </p>
                    {hearing.location && (
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {hearing.location}
                      </p>
                    )}
                    {hearing.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        {hearing.notes}
                      </p>
                    )}
                  </div>
                  {hearing.outcome && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {hearing.outcome}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appeals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Appeals ({violation.appeals.length})
        </h2>
        {violation.appeals.length === 0 ? (
          <p className="text-sm text-gray-500">No appeals filed.</p>
        ) : (
          <div className="space-y-4">
            {violation.appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    Submitted{" "}
                    {new Date(appeal.submitted_at).toLocaleDateString()}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      appeal.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : appeal.status === "denied"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {appeal.status}
                  </span>
                </div>
                <p className="text-sm text-gray-800 mb-2">{appeal.reason}</p>
                {appeal.resolution && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Resolution
                    </p>
                    <p className="text-sm text-gray-700">{appeal.resolution}</p>
                    {appeal.resolved_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Resolved{" "}
                        {new Date(appeal.resolved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
