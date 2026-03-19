"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Notice {
  id: string;
  sent_at: string;
  method: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_by_name: string;
}

interface Fine {
  id: string;
  amount: number;
  issued_at: string;
  due_date: string;
  status: string;
  description: string;
  issued_by_name: string;
}

interface Violation {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  location: string;
  reported_at: string;
  resolved_at: string | null;
  reporter_name: string;
  reporter_email: string;
  assigned_to_name: string | null;
  property_address: string;
  property_owner_name: string;
  notices: Notice[];
  fines: Fine[];
}

interface ViolationDetailProps {
  violation: Violation;
}

type ModalType = "notice" | "fine" | "resolve" | null;

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export default function ViolationDetail({ violation }: ViolationDetailProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [noticeForm, setNoticeForm] = useState({
    method: "email",
    recipient_email: violation.reporter_email || "",
    subject: `Notice: ${violation.title}`,
    body: "",
  });

  const [fineForm, setFineForm] = useState({
    amount: "",
    due_date: "",
    description: "",
  });

  const [resolveForm, setResolveForm] = useState({
    resolution_notes: "",
  });

  const userRole = (session?.user as any)?.role || "";
  const canSendNotice = ["admin", "officer", "manager"].includes(userRole);
  const canIssueFine = ["admin", "officer", "manager"].includes(userRole);
  const canResolve = ["admin", "officer", "manager"].includes(userRole);

  const closeModal = () => {
    setActiveModal(null);
    setError(null);
    setSuccess(null);
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/violations/${violation.id}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notice");
      setSuccess("Notice sent successfully");
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueFine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/violations/${violation.id}/fines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fineForm,
          amount: parseFloat(fineForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue fine");
      setSuccess("Fine issued successfully");
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/violations/${violation.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve violation");
      setSuccess("Violation resolved successfully");
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
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
            {violation.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">ID: {violation.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              STATUS_COLORS[violation.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {violation.status.replace("_", " ").toUpperCase()}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              SEVERITY_COLORS[violation.severity] || "bg-gray-100 text-gray-800"
            }`}
          >
            {violation.severity.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {violation.status !== "resolved" && violation.status !== "closed" && (
        <div className="flex gap-3 mb-6">
          {canSendNotice && (
            <button
              onClick={() => setActiveModal("notice")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Send Notice
            </button>
          )}
          {canIssueFine && (
            <button
              onClick={() => setActiveModal("fine")}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors"
            >
              Issue Fine
            </button>
          )}
          {canResolve && (
            <button
              onClick={() => setActiveModal("resolve")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {violation.description}
            </p>
          </div>

          {/* Notices */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notices ({violation.notices.length})
            </h2>
            {violation.notices.length === 0 ? (
              <p className="text-gray-500 text-sm">No notices sent yet.</p>
            ) : (
              <div className="space-y-4">
                {violation.notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {notice.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          To: {notice.recipient_email} · Via {notice.method}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(notice.sent_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {notice.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Sent by {notice.sent_by_name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fines */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Fines ({violation.fines.length})
            </h2>
            {violation.fines.length === 0 ? (
              <p className="text-gray-500 text-sm">No fines issued yet.</p>
            ) : (
              <div className="space-y-4">
                {violation.fines.map((fine) => (
                  <div
                    key={fine.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-lg">
                          {formatCurrency(fine.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(fine.due_date)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          fine.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : fine.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {fine.status.toUpperCase()}
                      </span>
                    </div>
                    {fine.description && (
                      <p className="text-sm text-gray-700">
                        {fine.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Issued by {fine.issued_by_name} on{" "}
                      {formatDate(fine.issued_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Property
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Address
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {violation.property_address || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Owner
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {violation.property_owner_name || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Location
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {violation.location || "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Reporter Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Reporter
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Name
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {violation.reporter_name || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {violation.reporter_email || "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reported
                </dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDate(violation.reported_at)}
                </dd>
              </div>
              {violation.assigned_to_name && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {violation.assigned_to_name}
                  </dd>
                </div>
              )}
              {violation.resolved_at && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Resolved
                  </dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {formatDate(violation.resolved_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Send Notice Modal */}
      {activeModal === "notice" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Notice
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
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
            <form onSubmit={handleSendNotice} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method
                </label>
                <select
                  value={noticeForm.method}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, method: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="email">Email</option>
                  <option value="mail">Mail</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={noticeForm.recipient_email}
                  onChange={(e) =>
                    setNoticeForm({
                      ...noticeForm,
                      recipient_email: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={noticeForm.subject}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, subject: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={noticeForm.body}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, body: e.target.value })
                  }
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Sending..." : "Send Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Fine Modal */}
      {activeModal === "fine" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Issue Fine
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
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
            <form onSubmit={handleIssueFine} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={fineForm.amount}
                  onChange={(e) =>
                    setFineForm({ ...fineForm, amount: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={fineForm.due_date}
                  onChange={(e) =>
                    setFineForm({ ...fineForm, due_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={fineForm.description}
                  onChange={(e) =>
                    setFineForm({ ...fineForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Reason for fine..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Issuing..." : "Issue Fine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {activeModal === "resolve" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Resolve Violation
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
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
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
              <p className="text-sm text-gray-600">
                Are you sure you want to mark this violation as resolved? This
                action will update the status and record the resolution
                timestamp.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolveForm.resolution_notes}
                  onChange={(e) =>
                    setResolveForm({
                      ...resolveForm,
                      resolution_notes: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe how the violation was resolved..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Resolving..." : "Mark as Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
