"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Photo {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface Notice {
  id: string;
  sent_at: string;
  method: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
}

interface Violation {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  reported_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  photos: Photo[];
  notices: Notice[];
  property_address?: string;
  violation_code?: string;
  due_date?: string;
}

interface ViolationDetailClientProps {
  violation: Violation;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800 border-red-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-orange-100 text-orange-800 border-orange-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-purple-100 text-purple-800 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export default function ViolationDetailClient({
  violation,
}: ViolationDetailClientProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(violation.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [noticeForm, setNoticeForm] = useState({
    recipient: "",
    subject: "",
    body: "",
    method: "email",
  });
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState("");
  const [notices, setNotices] = useState<Notice[]>(violation.notices || []);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setIsUpdatingStatus(true);
    setStatusError("");

    try {
      const response = await fetch(`/api/violations/${violation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setCurrentStatus(newStatus as Violation["status"]);
      router.refresh();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingNotice(true);
    setNoticeError("");
    setNoticeSuccess("");

    try {
      const response = await fetch(`/api/violations/${violation.id}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send notice");
      }

      const data = await response.json();
      setNotices((prev) => [data.notice, ...prev]);
      setNoticeSuccess("Notice sent successfully!");
      setNoticeForm({ recipient: "", subject: "", body: "", method: "email" });
    } catch (err) {
      setNoticeError(
        err instanceof Error ? err.message : "Failed to send notice",
      );
    } finally {
      setIsSendingNotice(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">
              Violation #{violation.id.slice(0, 8)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${SEVERITY_COLORS[violation.severity]}`}
            >
              {SEVERITY_LABELS[violation.severity]} Severity
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[currentStatus]}`}
            >
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Violation Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {violation.title}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {violation.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {violation.violation_code && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Violation Code
                    </p>
                    <p className="mt-1 text-sm text-gray-900 font-mono">
                      {violation.violation_code}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {violation.location}
                  </p>
                </div>
                {violation.property_address && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Property Address
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {violation.property_address}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Reported By
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {violation.reported_by}
                  </p>
                </div>
                {violation.assigned_to && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Assigned To
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {violation.assigned_to}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Reported On
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(violation.created_at)}
                  </p>
                </div>
                {violation.due_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Due Date
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(violation.due_date)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Last Updated
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(violation.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Photos */}
            {violation.photos && violation.photos.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Photos ({violation.photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {violation.photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || "Violation photo"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                          {photo.caption}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notice Log */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Notice Log ({notices.length})
              </h3>
              {notices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm">No notices sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <div
                      key={notice.id}
                      className="border border-gray-100 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {notice.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            To: {notice.recipient}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                            {notice.method}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              notice.status === "sent"
                                ? "bg-green-100 text-green-700"
                                : notice.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {notice.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notice.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notice.sent_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Notice Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Send Notice
              </h3>
              <form onSubmit={handleSendNotice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient *
                    </label>
                    <input
                      type="text"
                      required
                      value={noticeForm.recipient}
                      onChange={(e) =>
                        setNoticeForm((prev) => ({
                          ...prev,
                          recipient: e.target.value,
                        }))
                      }
                      placeholder="email@example.com or phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Method *
                    </label>
                    <select
                      value={noticeForm.method}
                      onChange={(e) =>
                        setNoticeForm((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="mail">Physical Mail</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={noticeForm.subject}
                    onChange={(e) =>
                      setNoticeForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Notice subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={noticeForm.body}
                    onChange={(e) =>
                      setNoticeForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Enter the notice message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {noticeError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">{noticeError}</p>
                  </div>
                )}

                {noticeSuccess && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">{noticeSuccess}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingNotice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSendingNotice ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
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
                      Sending...
                    </>
                  ) : (
                    <>
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
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      Send Notice
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Update Status
              </h3>

              {statusError && (
                <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  {statusError}
                </div>
              )}

              <div className="space-y-2">
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdatingStatus || status === currentStatus}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      status === currentStatus
                        ? `${STATUS_COLORS[status]} cursor-default`
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    <span>{label}</span>
                    {status === currentStatus && (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {isUpdatingStatus && status !== currentStatus && (
                      <svg
                        className="w-4 h-4 animate-spin text-gray-400"
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
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Print Report
                </button>
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Link
                </button>
              </div>
            </div>

            {/* Violation Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Summary
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500">Photos</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {violation.photos?.length || 0}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500">Notices Sent</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {notices.length}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500">Severity</dt>
                  <dd>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[violation.severity]}`}
                    >
                      {SEVERITY_LABELS[violation.severity]}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500">Status</dt>
                  <dd>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[currentStatus]}`}
                    >
                      {STATUS_LABELS[currentStatus]}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-8 h-8"
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
            <div
              className="relative w-full"
              style={{ paddingBottom: "66.67%" }}
            >
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Violation photo"}
                fill
                className="object-contain rounded-lg"
              />
            </div>
            {selectedPhoto.caption && (
              <p className="text-white text-center mt-3 text-sm">
                {selectedPhoto.caption}
              </p>
            )}
            <p className="text-gray-400 text-center mt-1 text-xs">
              {formatDate(selectedPhoto.created_at)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
