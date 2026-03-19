"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  CreditCard,
  XCircle,
  RefreshCw,
} from "lucide-react";

type ViolationStatus =
  | "open"
  | "under_review"
  | "resolved"
  | "dismissed"
  | "appealed";

type FineLedgerEntry = {
  id: string;
  type: "issued" | "payment" | "waiver" | "adjustment";
  amount: number;
  date: string;
  description: string;
  createdBy: string;
};

type AuditLogEntry = {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
};

type Violation = {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: ViolationStatus;
  severity: "low" | "medium" | "high" | "critical";
  reportedDate: string;
  dueDate?: string;
  resolvedDate?: string;
  location: string;
  reportedBy: string;
  assignedTo?: string;
  category: string;
  notes?: string;
  totalFinesIssued: number;
  totalFinesPaid: number;
  fineLedger: FineLedgerEntry[];
  auditLog: AuditLogEntry[];
};

type Props = {
  violation: Violation;
  onStatusUpdate: (
    id: string,
    status: ViolationStatus,
    notes?: string,
  ) => Promise<void>;
  onIssueFine: (
    id: string,
    amount: number,
    description: string,
  ) => Promise<void>;
  onRecordPayment: (
    id: string,
    amount: number,
    description: string,
  ) => Promise<void>;
};

const statusConfig: Record<
  ViolationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  open: {
    label: "Open",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  under_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Clock className="w-4 h-4" />,
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  dismissed: {
    label: "Dismissed",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <XCircle className="w-4 h-4" />,
  },
  appealed: {
    label: "Appealed",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <RefreshCw className="w-4 h-4" />,
  },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
};

const ledgerTypeConfig: Record<
  string,
  { label: string; color: string; sign: string }
> = {
  issued: { label: "Fine Issued", color: "text-red-600", sign: "+" },
  payment: { label: "Payment", color: "text-green-600", sign: "-" },
  waiver: { label: "Waiver", color: "text-blue-600", sign: "-" },
  adjustment: { label: "Adjustment", color: "text-purple-600", sign: "±" },
};

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function StatusUpdateModal({
  isOpen,
  onClose,
  currentStatus,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ViolationStatus;
  onSubmit: (status: ViolationStatus, notes: string) => void;
  isPending: boolean;
}) {
  const [selectedStatus, setSelectedStatus] =
    useState<ViolationStatus>(currentStatus);
  const [notes, setNotes] = useState("");

  const statuses: ViolationStatus[] = [
    "open",
    "under_review",
    "resolved",
    "dismissed",
    "appealed",
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Violation Status">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Status
          </label>
          <div className="grid grid-cols-1 gap-2">
            {statuses.map((status) => {
              const cfg = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedStatus === status
                      ? `${cfg.color} border-current ring-2 ring-offset-1 ring-current`
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add notes about this status change..."
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(selectedStatus, notes)}
            disabled={isPending || selectedStatus === currentStatus}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Updating..." : "Update Status"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FineModal({
  isOpen,
  onClose,
  mode,
  onSubmit,
  isPending,
  maxAmount,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "issue" | "payment";
  onSubmit: (amount: number, description: string) => void;
  isPending: boolean;
  maxAmount?: number;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (maxAmount !== undefined && parsed > maxAmount) {
      setError(`Amount cannot exceed $${maxAmount.toFixed(2)}`);
      return;
    }
    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }
    setError("");
    onSubmit(parsed, description);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "issue" ? "Issue Fine" : "Record Payment"}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ($)
            {maxAmount !== undefined && (
              <span className="text-gray-500 font-normal ml-1">
                (max: ${maxAmount.toFixed(2)})
              </span>
            )}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
            }}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              mode === "issue"
                ? "Reason for fine..."
                : "Payment reference or notes..."
            }
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "issue"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isPending
              ? "Processing..."
              : mode === "issue"
                ? "Issue Fine"
                : "Record Payment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ViolationDetailClient({
  violation: initialViolation,
  onStatusUpdate,
  onIssueFine,
  onRecordPayment,
}: Props) {
  const [violation, setViolation] = useState(initialViolation);
  const [isPending, startTransition] = useTransition();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(true);
  const [ledgerExpanded, setLedgerExpanded] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 4000);
  };

  const handleStatusUpdate = (status: ViolationStatus, notes: string) => {
    startTransition(async () => {
      try {
        await onStatusUpdate(violation.id, status, notes);
        setViolation((prev) => ({ ...prev, status }));
        setShowStatusModal(false);
        showSuccess("Status updated successfully");
      } catch {
        showError("Failed to update status. Please try again.");
      }
    });
  };

  const handleIssueFine = (amount: number, description: string) => {
    startTransition(async () => {
      try {
        await onIssueFine(violation.id, amount, description);
        const newEntry: FineLedgerEntry = {
          id: Date.now().toString(),
          type: "issued",
          amount,
          date: new Date().toISOString(),
          description,
          createdBy: "Current User",
        };
        setViolation((prev) => ({
          ...prev,
          totalFinesIssued: prev.totalFinesIssued + amount,
          fineLedger: [newEntry, ...prev.fineLedger],
        }));
        setShowFineModal(false);
        showSuccess(`Fine of $${amount.toFixed(2)} issued successfully`);
      } catch {
        showError("Failed to issue fine. Please try again.");
      }
    });
  };

  const handleRecordPayment = (amount: number, description: string) => {
    startTransition(async () => {
      try {
        await onRecordPayment(violation.id, amount, description);
        const newEntry: FineLedgerEntry = {
          id: Date.now().toString(),
          type: "payment",
          amount,
          date: new Date().toISOString(),
          description,
          createdBy: "Current User",
        };
        setViolation((prev) => ({
          ...prev,
          totalFinesPaid: prev.totalFinesPaid + amount,
          fineLedger: [newEntry, ...prev.fineLedger],
        }));
        setShowPaymentModal(false);
        showSuccess(`Payment of $${amount.toFixed(2)} recorded successfully`);
      } catch {
        showError("Failed to record payment. Please try again.");
      }
    });
  };

  const statusCfg = statusConfig[violation.status];
  const severityCfg = severityConfig[violation.severity];
  const outstandingBalance =
    violation.totalFinesIssued - violation.totalFinesPaid;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {violation.caseNumber}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityCfg.color}`}
                >
                  {severityCfg.label} Severity
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {violation.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{violation.category}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${statusCfg.color}`}
              >
                {statusCfg.icon}
                {statusCfg.label}
              </span>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Reported</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(violation.reportedDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            {violation.dueDate && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(violation.dueDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Reported By</p>
                <p className="text-sm font-medium text-gray-900">
                  {violation.reportedBy}
                </p>
              </div>
            </div>
            {violation.assignedTo && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Assigned To</p>
                  <p className="text-sm font-medium text-gray-900">
                    {violation.assignedTo}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {violation.description}
            </p>
          </div>

          {violation.notes && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-yellow-800 mb-1">
                Notes
              </p>
              <p className="text-sm text-yellow-700">{violation.notes}</p>
            </div>
          )}
        </div>

        {/* Fine Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-500" />
              Fine Summary
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFineModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Issue Fine
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={outstandingBalance <= 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-xs text-red-600 font-medium mb-1">
                Total Fines Issued
              </p>
              <p className="text-2xl font-bold text-red-700">
                ${violation.totalFinesIssued.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 font-medium mb-1">
                Total Paid
              </p>
              <p className="text-2xl font-bold text-green-700">
                ${violation.totalFinesPaid.toFixed(2)}
              </p>
            </div>
            <div
              className={`rounded-lg p-4 text-center ${outstandingBalance > 0 ? "bg-orange-50" : "bg-gray-50"}`}
            >
              <p
                className={`text-xs font-medium mb-1 ${outstandingBalance > 0 ? "text-orange-600" : "text-gray-500"}`}
              >
                Outstanding Balance
              </p>
              <p
                className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-orange-700" : "text-gray-600"}`}
              >
                ${outstandingBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Fine Ledger */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setLedgerExpanded(!ledgerExpanded)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h2 className="text-base font-semibold text-gray-900">
              Fine Ledger
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({violation.fineLedger.length} entries)
              </span>
            </h2>
            {ledgerExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {ledgerExpanded && (
            <div className="border-t border-gray-100">
              {violation.fineLedger.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                  No ledger entries yet. Issue a fine to get started.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {violation.fineLedger.map((entry) => {
                    const typeCfg = ledgerTypeConfig[entry.type];
                    return (
                      <div
                        key={entry.id}
                        className="px-6 py-4 flex items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                entry.type === "issued"
                                  ? "bg-red-100 text-red-700"
                                  : entry.type === "payment"
                                    ? "bg-green-100 text-green-700"
                                    : entry.type === "waiver"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {typeCfg.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(
                                new Date(entry.date),
                                "MMM d, yyyy h:mm a",
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            by {entry.createdBy}
                          </p>
                        </div>
                        <div
                          className={`text-base font-bold whitespace-nowrap ${typeCfg.color}`}
                        >
                          {typeCfg.sign}${entry.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setAuditExpanded(!auditExpanded)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h2 className="text-base font-semibold text-gray-900">
              Audit Log
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({violation.auditLog.length} events)
              </span>
            </h2>
            {auditExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {auditExpanded && (
            <div className="border-t border-gray-100 px-6 py-4">
              {violation.auditLog.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No audit events recorded.
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-6">
                    {violation.auditLog.map((entry, index) => (
                      <div key={entry.id} className="relative flex gap-4 pl-10">
                        {/* Dot */}
                        <div
                          className={`absolute left-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                            index === 0 ? "bg-blue-500" : "bg-gray-300"
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {entry.action}
                              </p>
                              <p className="text-xs text-gray-500">
                                by {entry.performedBy}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {format(
                                new Date(entry.timestamp),
                                "MMM d, yyyy h:mm a",
                              )}
                            </span>
                          </div>
                          {entry.details && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.details}
                            </p>
                          )}
                          {entry.previousValue && entry.newValue && (
                            <div className="mt-1.5 flex items-center gap-2 text-xs">
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded line-through">
                                {entry.previousValue}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">
                                {entry.newValue}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={violation.status}
        onSubmit={handleStatusUpdate}
        isPending={isPending}
      />

      <FineModal
        isOpen={showFineModal}
        onClose={() => setShowFineModal(false)}
        mode="issue"
        onSubmit={handleIssueFine}
        isPending={isPending}
      />

      <FineModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        mode="payment"
        onSubmit={handleRecordPayment}
        isPending={isPending}
        maxAmount={outstandingBalance}
      />
    </div>
  );
}
