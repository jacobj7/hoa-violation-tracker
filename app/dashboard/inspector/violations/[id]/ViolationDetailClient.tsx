"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ViolationLog {
  id: string;
  action: string;
  notes: string;
  created_at: string;
  created_by_name: string;
  fine_amount?: number;
  notice_type?: string;
}

interface Violation {
  id: string;
  reference_number: string;
  status: string;
  violation_type: string;
  description: string;
  location: string;
  reported_by_name: string;
  reported_at: string;
  inspector_name?: string;
  assigned_at?: string;
  resolved_at?: string;
  closed_at?: string;
  fine_total: number;
  notes?: string;
  logs: ViolationLog[];
}

interface ViolationDetailClientProps {
  violation: Violation;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  notice_sent: "bg-purple-100 text-purple-800 border-purple-200",
  fine_issued: "bg-red-100 text-red-800 border-red-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_review: "Under Review",
  notice_sent: "Notice Sent",
  fine_issued: "Fine Issued",
  resolved: "Resolved",
  closed: "Closed",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Violation Created",
  assigned: "Assigned to Inspector",
  notice_sent: "Notice Sent",
  fine_issued: "Fine Issued",
  resolved: "Resolved",
  closed: "Closed",
  note_added: "Note Added",
  status_changed: "Status Changed",
};

export default function ViolationDetailClient({
  violation,
}: ViolationDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form states
  const [noticeType, setNoticeType] = useState("warning");
  const [noticeNotes, setNoticeNotes] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineNotes, setFineNotes] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const canSendNotice = ["open", "under_review"].includes(violation.status);
  const canIssueFine = ["open", "under_review", "notice_sent"].includes(
    violation.status,
  );
  const canResolve = ["notice_sent", "fine_issued", "under_review"].includes(
    violation.status,
  );
  const canClose = ["resolved"].includes(violation.status);

  const handleAction = async (
    action: string,
    payload: Record<string, unknown>,
  ) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/violations/${violation.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed. Please try again.");
        return;
      }

      setSuccess(data.message || "Action completed successfully.");
      setActiveModal(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction("send_notice", {
      notice_type: noticeType,
      notes: noticeNotes,
    });
    setNoticeNotes("");
  };

  const handleIssueFine = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fineAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid fine amount.");
      return;
    }
    await handleAction("issue_fine", { fine_amount: amount, notes: fineNotes });
    setFineAmount("");
    setFineNotes("");
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction("resolve", { notes: resolveNotes });
    setResolveNotes("");
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction("close", { notes: closeNotes });
    setCloseNotes("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Violation #{violation.reference_number}
          </h1>
          <p className="text-gray-500 mt-1">{violation.violation_type}</p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
            STATUS_COLORS[violation.status] ||
            "bg-gray-100 text-gray-800 border-gray-200"
          }`}
        >
          {STATUS_LABELS[violation.status] || violation.status}
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Violation Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {violation.location}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reported By
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {violation.reported_by_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reported At
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(violation.reported_at)}
                </dd>
              </div>
              {violation.inspector_name && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned Inspector
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {violation.inspector_name}
                  </dd>
                </div>
              )}
              {violation.assigned_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(violation.assigned_at)}
                  </dd>
                </div>
              )}
              {violation.resolved_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Resolved At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(violation.resolved_at)}
                  </dd>
                </div>
              )}
              {violation.closed_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Closed At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(violation.closed_at)}
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {violation.description}
                </dd>
              </div>
              {violation.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {violation.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Activity Log
            </h2>
            {violation.logs.length === 0 ? (
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 space-y-6 ml-3">
                {violation.logs.map((log) => (
                  <li key={log.id} className="ml-6">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-8 ring-white">
                      <svg
                        className="w-3 h-3 text-blue-600"
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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ACTION_LABELS[log.action] || log.action}
                        </p>
                        {log.fine_amount && (
                          <p className="text-sm text-red-600 font-medium">
                            Fine: {formatCurrency(log.fine_amount)}
                          </p>
                        )}
                        {log.notice_type && (
                          <p className="text-sm text-purple-600">
                            Notice type: {log.notice_type}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            {log.notes}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          by {log.created_by_name}
                        </p>
                      </div>
                      <time className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Fine Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Fine Summary
            </h2>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(violation.fine_total)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total fines issued</p>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setActiveModal("notice")}
                disabled={!canSendNotice || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Send Notice
              </button>

              <button
                onClick={() => setActiveModal("fine")}
                disabled={!canIssueFine || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Issue Fine
              </button>

              <button
                onClick={() => setActiveModal("resolve")}
                disabled={!canResolve || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Mark Resolved
              </button>

              <button
                onClick={() => setActiveModal("close")}
                disabled={!canClose || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-4 h-4"
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
                Close Violation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            {/* Send Notice Modal */}
            {activeModal === "notice" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Send Notice
                </h3>
                <form onSubmit={handleSendNotice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notice Type
                    </label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="warning">Warning</option>
                      <option value="formal_notice">Formal Notice</option>
                      <option value="final_notice">Final Notice</option>
                      <option value="cease_and_desist">Cease and Desist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={noticeNotes}
                      onChange={(e) => setNoticeNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                    >
                      {loading ? "Sending..." : "Send Notice"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Issue Fine Modal */}
            {activeModal === "fine" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Issue Fine
                </h3>
                <form onSubmit={handleIssueFine} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fine Amount ($)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={fineNotes}
                      onChange={(e) => setFineNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Reason for fine..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                    >
                      {loading ? "Issuing..." : "Issue Fine"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Resolve Modal */}
            {activeModal === "resolve" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Mark as Resolved
                </h3>
                <form onSubmit={handleResolve} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution Notes
                    </label>
                    <textarea
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Describe how the violation was resolved..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                    >
                      {loading ? "Resolving..." : "Mark Resolved"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Close Modal */}
            {activeModal === "close" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Close Violation
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Closing this violation will archive it. This action cannot be
                  undone.
                </p>
                <form onSubmit={handleClose} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Closing Notes
                    </label>
                    <textarea
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="Any final notes..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
                    >
                      {loading ? "Closing..." : "Close Violation"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
