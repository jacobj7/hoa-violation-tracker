"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Evidence {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

interface Notice {
  id: string;
  type: string;
  sentAt: string;
  method: string;
  recipient: string;
}

interface Fine {
  id: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  status: "pending" | "paid" | "waived" | "overdue";
  paidAt?: string;
}

interface Appeal {
  id: string;
  submittedAt: string;
  status: "pending" | "approved" | "denied";
  reason: string;
  resolution?: string;
  resolvedAt?: string;
}

interface StatusEvent {
  status: string;
  timestamp: string;
  actor: string;
  note?: string;
}

interface Violation {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  description: string;
  address: string;
  reportedAt: string;
  reportedBy: string;
  assignedTo?: string;
  evidence: Evidence[];
  notices: Notice[];
  fines: Fine[];
  appeals: Appeal[];
  timeline: StatusEvent[];
}

interface ViolationDetailClientProps {
  violation: Violation;
  userRole: string;
  userId: string;
}

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  notice_sent: "bg-purple-100 text-purple-800 border-purple-200",
  pending_compliance: "bg-orange-100 text-orange-800 border-orange-200",
  compliant: "bg-green-100 text-green-800 border-green-200",
  fined: "bg-red-100 text-red-800 border-red-200",
  appealed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  under_review: "Under Review",
  notice_sent: "Notice Sent",
  pending_compliance: "Pending Compliance",
  compliant: "Compliant",
  fined: "Fined",
  appealed: "Appealed",
  closed: "Closed",
};

const FINE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  waived: "bg-gray-100 text-gray-800",
  overdue: "bg-red-100 text-red-800",
};

const APPEAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

function getAvailableTransitions(
  status: string,
  role: string,
): { label: string; nextStatus: string; variant: string }[] {
  const transitions: Record<
    string,
    { label: string; nextStatus: string; variant: string }[]
  > = {
    reported: [
      { label: "Start Review", nextStatus: "under_review", variant: "primary" },
    ],
    under_review: [
      { label: "Send Notice", nextStatus: "notice_sent", variant: "primary" },
      { label: "Mark Compliant", nextStatus: "compliant", variant: "success" },
      { label: "Issue Fine", nextStatus: "fined", variant: "danger" },
    ],
    notice_sent: [
      {
        label: "Await Compliance",
        nextStatus: "pending_compliance",
        variant: "primary",
      },
      { label: "Issue Fine", nextStatus: "fined", variant: "danger" },
    ],
    pending_compliance: [
      { label: "Mark Compliant", nextStatus: "compliant", variant: "success" },
      { label: "Issue Fine", nextStatus: "fined", variant: "danger" },
    ],
    fined: [
      { label: "Mark Compliant", nextStatus: "compliant", variant: "success" },
      { label: "Close Case", nextStatus: "closed", variant: "secondary" },
    ],
    appealed: [
      { label: "Approve Appeal", nextStatus: "compliant", variant: "success" },
      { label: "Deny Appeal", nextStatus: "fined", variant: "danger" },
    ],
    compliant: [
      { label: "Close Case", nextStatus: "closed", variant: "secondary" },
    ],
    closed: [],
  };

  const adminRoles = ["admin", "officer", "supervisor"];
  if (!adminRoles.includes(role)) {
    if (status === "fined" || status === "pending_compliance") {
      return [
        { label: "File Appeal", nextStatus: "appealed", variant: "primary" },
      ];
    }
    return [];
  }

  return transitions[status] || [];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BUTTON_VARIANTS: Record<string, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  secondary: "bg-gray-600 hover:bg-gray-700 text-white",
};

export default function ViolationDetailClient({
  violation,
  userRole,
  userId,
}: ViolationDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "evidence" | "notices" | "fines" | "appeals"
  >("overview");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    label: string;
    nextStatus: string;
    variant: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Evidence | null>(null);

  const availableTransitions = getAvailableTransitions(
    violation.status,
    userRole,
  );

  const handleTransitionClick = (transition: {
    label: string;
    nextStatus: string;
    variant: string;
  }) => {
    setPendingTransition(transition);
    setTransitionNote("");
    setShowNoteModal(true);
  };

  const handleTransitionConfirm = async () => {
    if (!pendingTransition) return;
    setIsTransitioning(true);
    setError(null);
    try {
      const res = await fetch(`/api/violations/${violation.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: pendingTransition.nextStatus,
          note: transitionNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      setShowNoteModal(false);
      setPendingTransition(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsTransitioning(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "evidence", label: `Evidence (${violation.evidence.length})` },
    { id: "notices", label: `Notices (${violation.notices.length})` },
    { id: "fines", label: `Fines (${violation.fines.length})` },
    { id: "appeals", label: `Appeals (${violation.appeals.length})` },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button
              onClick={() => router.push("/violations")}
              className="hover:text-gray-700 transition-colors"
            >
              Violations
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {violation.caseNumber}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {violation.type}
              </h1>
              <p className="text-gray-500 mt-1">{violation.address}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[violation.status] || "bg-gray-100 text-gray-800 border-gray-200"}`}
              >
                {STATUS_LABELS[violation.status] || violation.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Status Transition Buttons */}
        {availableTransitions.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Available Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((transition) => (
                <button
                  key={transition.nextStatus}
                  onClick={() => handleTransitionClick(transition)}
                  disabled={isTransitioning}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[transition.variant]}`}
                >
                  {transition.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                        Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {violation.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Case Number
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {violation.caseNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Violation Type
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {violation.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Reported By
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {violation.reportedBy}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Reported At
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(violation.reportedAt)}
                        </p>
                      </div>
                      {violation.assignedTo && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Assigned To
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {violation.assignedTo}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Address
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {violation.address}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Tab */}
                {activeTab === "evidence" && (
                  <div>
                    {violation.evidence.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-300 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p>No evidence photos uploaded</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {violation.evidence.map((item) => (
                          <div
                            key={item.id}
                            className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                            onClick={() => setSelectedImage(item)}
                          >
                            <div className="relative aspect-square bg-gray-100">
                              <Image
                                src={item.url}
                                alt={item.caption || "Evidence photo"}
                                fill
                                className="object-cover group-hover:opacity-90 transition-opacity"
                              />
                            </div>
                            <div className="p-2">
                              {item.caption && (
                                <p className="text-xs text-gray-700 font-medium truncate">
                                  {item.caption}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                {formatDate(item.uploadedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notices Tab */}
                {activeTab === "notices" && (
                  <div>
                    {violation.notices.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-300 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <p>No notices sent</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {violation.notices.map((notice) => (
                          <div
                            key={notice.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {notice.type}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  To: {notice.recipient}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Via: {notice.method}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400">
                                {formatDate(notice.sentAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fines Tab */}
                {activeTab === "fines" && (
                  <div>
                    {violation.fines.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-300 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p>No fines issued</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {violation.fines.map((fine) => (
                          <div
                            key={fine.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatCurrency(fine.amount)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Issued: {formatDate(fine.issuedAt)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Due: {formatDate(fine.dueDate)}
                                </p>
                                {fine.paidAt && (
                                  <p className="text-xs text-green-600">
                                    Paid: {formatDate(fine.paidAt)}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FINE_STATUS_COLORS[fine.status]}`}
                              >
                                {fine.status.charAt(0).toUpperCase() +
                                  fine.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              Total Fines
                            </span>
                            <span className="font-bold text-gray-900">
                              {formatCurrency(
                                violation.fines.reduce(
                                  (sum, f) => sum + f.amount,
                                  0,
                                ),
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Appeals Tab */}
                {activeTab === "appeals" && (
                  <div>
                    {violation.appeals.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-300 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p>No appeals filed</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {violation.appeals.map((appeal) => (
                          <div
                            key={appeal.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-xs text-gray-500">
                                Submitted: {formatDate(appeal.submittedAt)}
                              </p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${APPEAL_STATUS_COLORS[appeal.status]}`}
                              >
                                {appeal.status.charAt(0).toUpperCase() +
                                  appeal.status.slice(1)}
                              </span>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                Reason
                              </p>
                              <p className="text-sm text-gray-600">
                                {appeal.reason}
                              </p>
                            </div>
                            {appeal.resolution && (
                              <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  Resolution
                                </p>
                                <p className="text-sm text-gray-600">
                                  {appeal.resolution}
                                </p>
                                {appeal.resolvedAt && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Resolved: {formatDate(appeal.resolvedAt)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Status Timeline
              </h3>
              {violation.timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No timeline events</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-6">
                    {violation.timeline.map((event, index) => (
                      <div key={index} className="relative flex gap-4">
                        <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {STATUS_LABELS[event.status] || event.status}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {event.actor}
                          </p>
                          {event.note && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              {event.note}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showNoteModal && pendingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {pendingTransition.label}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                This will change the status to{" "}
                <span className="font-medium text-gray-700">
                  {STATUS_LABELS[pendingTransition.nextStatus] ||
                    pendingTransition.nextStatus}
                </span>
                .
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note about this status change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setPendingTransition(null);
                    setError(null);
                  }}
                  disabled={isTransitioning}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransitionConfirm}
                  disabled={isTransitioning}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[pendingTransition.variant]}`}
                >
                  {isTransitioning ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-8 h-8"
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
            <div
              className="relative w-full"
              style={{ paddingBottom: "66.67%" }}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption || "Evidence photo"}
                fill
                className="object-contain rounded-lg"
              />
            </div>
            {selectedImage.caption && (
              <p className="text-white text-center mt-3 text-sm">
                {selectedImage.caption}
              </p>
            )}
            <p className="text-gray-400 text-center mt-1 text-xs">
              {formatDate(selectedImage.uploadedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
