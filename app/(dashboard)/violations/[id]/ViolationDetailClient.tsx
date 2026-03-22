"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  changed_by: string;
  notes: string | null;
}

interface Evidence {
  id: string;
  url: string;
  caption: string | null;
  uploaded_at: string;
}

interface Violation {
  id: string;
  property_address: string;
  category: string;
  description: string;
  inspector_name: string;
  inspector_id: string;
  status: string;
  cure_deadline: string | null;
  notes: string | null;
  fine_amount: number | null;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
  evidence: Evidence[];
}

interface ViolationDetailClientProps {
  violation: Violation;
  userRole: string;
  userId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  notice_issued: "bg-orange-100 text-orange-800 border-orange-200",
  fined: "bg-red-100 text-red-800 border-red-200",
  appealed: "bg-purple-100 text-purple-800 border-purple-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  dismissed: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  notice_issued: "Notice Issued",
  fined: "Fined",
  appealed: "Appealed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  notice_issued: "📋",
  fined: "💰",
  appealed: "⚖️",
  resolved: "🎉",
  dismissed: "❌",
};

export default function ViolationDetailClient({
  violation,
  userRole,
  userId,
}: ViolationDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [cureDeadline, setCureDeadline] = useState(
    violation.cure_deadline ? violation.cure_deadline.split("T")[0] : "",
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const patchViolation = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/violations/${violation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      setSuccess("Action completed successfully");
      setActiveAction(null);
      setActionNotes("");
      setFineAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    patchViolation({
      status: "confirmed",
      notes: actionNotes || undefined,
    });
  };

  const handleIssueNotice = () => {
    if (!cureDeadline) {
      setError("Cure deadline is required to issue a notice");
      return;
    }
    patchViolation({
      status: "notice_issued",
      cure_deadline: cureDeadline,
      notes: actionNotes || undefined,
    });
  };

  const handleApplyFine = () => {
    const amount = parseFloat(fineAmount);
    if (!fineAmount || isNaN(amount) || amount <= 0) {
      setError("Valid fine amount is required");
      return;
    }
    patchViolation({
      status: "fined",
      fine_amount: amount,
      notes: actionNotes || undefined,
    });
  };

  const handleResolve = () => {
    patchViolation({
      status: "resolved",
      notes: actionNotes || undefined,
    });
  };

  const handleDismiss = () => {
    patchViolation({
      status: "dismissed",
      notes: actionNotes || undefined,
    });
  };

  const handleAppealDecision = (approved: boolean) => {
    patchViolation({
      status: approved ? "dismissed" : "fined",
      notes: actionNotes || undefined,
    });
  };

  const canConfirm =
    userRole === "inspector" &&
    violation.status === "pending" &&
    violation.inspector_id === userId;

  const canIssueNotice =
    userRole === "manager" && violation.status === "confirmed";

  const canApplyFine =
    userRole === "manager" && violation.status === "notice_issued";

  const canResolve =
    userRole === "manager" &&
    ["confirmed", "notice_issued", "fined"].includes(violation.status);

  const canDismiss =
    userRole === "manager" &&
    ["pending", "confirmed", "notice_issued"].includes(violation.status);

  const canDecideAppeal =
    userRole === "board" && violation.status === "appealed";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 transition-colors"
          >
            ← Back to Violations
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Violation #{violation.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-gray-500 mt-1">{violation.property_address}</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
            STATUS_COLORS[violation.status] ||
            "bg-gray-100 text-gray-800 border-gray-200"
          }`}
        >
          <span>{STATUS_ICONS[violation.status]}</span>
          {STATUS_LABELS[violation.status] || violation.status}
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-green-500 text-lg">✅</span>
          <div>
            <p className="text-green-800 font-medium">Success</p>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Violation Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Violation Details
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category
                  </label>
                  <p className="mt-1 text-gray-900 font-medium capitalize">
                    {violation.category.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Inspector
                  </label>
                  <p className="mt-1 text-gray-900 font-medium">
                    {violation.inspector_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Reported Date
                  </label>
                  <p className="mt-1 text-gray-900">
                    {formatDateShort(violation.created_at)}
                  </p>
                </div>
                {violation.cure_deadline && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Cure Deadline
                    </label>
                    <p
                      className={`mt-1 font-medium ${
                        new Date(violation.cure_deadline) < new Date()
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {formatDateShort(violation.cure_deadline)}
                      {new Date(violation.cure_deadline) < new Date() && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {violation.fine_amount !== null && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Fine Amount
                    </label>
                    <p className="mt-1 text-red-600 font-semibold text-lg">
                      ${violation.fine_amount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </label>
                <p className="mt-2 text-gray-700 leading-relaxed">
                  {violation.description}
                </p>
              </div>

              {violation.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <label className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Notes
                  </label>
                  <p className="mt-1 text-amber-900 text-sm leading-relaxed">
                    {violation.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Photos */}
          {violation.evidence && violation.evidence.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  Evidence Photos
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({violation.evidence.length})
                  </span>
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {violation.evidence.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedImage(photo.url)}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || "Evidence photo"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl">
                          🔍
                        </span>
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                          {photo.caption}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {violation.status_history && violation.status_history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  Status Timeline
                </h2>
              </div>
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {violation.status_history.map((entry, index) => (
                      <div key={entry.id} className="relative flex gap-4">
                        <div
                          className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm ${
                            index === 0
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "bg-white border-gray-300 text-gray-500"
                          }`}
                        >
                          {STATUS_ICONS[entry.status] || "•"}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {STATUS_LABELS[entry.status] || entry.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(entry.changed_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            by {entry.changed_by}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-500 mt-1 italic">
                              &ldquo;{entry.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Action Panel */}
          {(canConfirm ||
            canIssueNotice ||
            canApplyFine ||
            canResolve ||
            canDismiss ||
            canDecideAppeal) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                {/* Inspector Actions */}
                {canConfirm && (
                  <button
                    onClick={() =>
                      setActiveAction(
                        activeAction === "confirm" ? null : "confirm",
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    ✅ Confirm Violation
                  </button>
                )}

                {/* Manager Actions */}
                {canIssueNotice && (
                  <button
                    onClick={() =>
                      setActiveAction(
                        activeAction === "notice" ? null : "notice",
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    📋 Issue Notice
                  </button>
                )}

                {canApplyFine && (
                  <button
                    onClick={() =>
                      setActiveAction(activeAction === "fine" ? null : "fine")
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    💰 Apply Fine
                  </button>
                )}

                {canResolve && (
                  <button
                    onClick={() =>
                      setActiveAction(
                        activeAction === "resolve" ? null : "resolve",
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    🎉 Mark Resolved
                  </button>
                )}

                {canDismiss && (
                  <button
                    onClick={() =>
                      setActiveAction(
                        activeAction === "dismiss" ? null : "dismiss",
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    ❌ Dismiss
                  </button>
                )}

                {/* Board Actions */}
                {canDecideAppeal && (
                  <>
                    <button
                      onClick={() =>
                        setActiveAction(
                          activeAction === "appeal_approve"
                            ? null
                            : "appeal_approve",
                        )
                      }
                      className="w-full text-left px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 transition-colors font-medium text-sm flex items-center gap-2"
                    >
                      ⚖️ Approve Appeal (Dismiss)
                    </button>
                    <button
                      onClick={() =>
                        setActiveAction(
                          activeAction === "appeal_deny" ? null : "appeal_deny",
                        )
                      }
                      className="w-full text-left px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
                    >
                      ⚖️ Deny Appeal (Uphold Fine)
                    </button>
                  </>
                )}

                {/* Action Forms */}
                {activeAction && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {activeAction === "notice" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cure Deadline <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={cureDeadline}
                          onChange={(e) => setCureDeadline(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {activeAction === "fine" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fine Amount ($){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={fineAmount}
                          onChange={(e) => setFineAmount(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Add any relevant notes..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (activeAction === "confirm") handleConfirm();
                          else if (activeAction === "notice")
                            handleIssueNotice();
                          else if (activeAction === "fine") handleApplyFine();
                          else if (activeAction === "resolve") handleResolve();
                          else if (activeAction === "dismiss") handleDismiss();
                          else if (activeAction === "appeal_approve")
                            handleAppealDecision(true);
                          else if (activeAction === "appeal_deny")
                            handleAppealDecision(false);
                        }}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="animate-spin h-4 w-4"
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
                            Processing...
                          </span>
                        ) : (
                          "Confirm"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setActiveAction(null);
                          setActionNotes("");
                          setFineAmount("");
                          setError(null);
                        }}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Info
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  🏠
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Property</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {violation.property_address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                  🏷️
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {violation.category.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                  👤
                </div>
                <div>
                  <p className="text-xs text-gray-500">Inspector</p>
                  <p className="text-sm font-medium text-gray-900">
                    {violation.inspector_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  📅
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateShort(violation.updated_at)}
                  </p>
                </div>
              </div>
              {violation.fine_amount !== null && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    💰
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fine Amount</p>
                    <p className="text-sm font-semibold text-red-600">
                      ${violation.fine_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors z-10"
          >
            ✕
          </button>
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt="Evidence photo"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
