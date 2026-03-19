"use client";

import { useState } from "react";
import { z } from "zod";

const FineSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  memberName: z.string(),
  reason: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.enum(["pending", "paid", "overdue", "waived"]),
  issuedAt: z.string(),
  paidAt: z.string().nullable().optional(),
});

type Fine = z.infer<typeof FineSchema>;

const mockFines: Fine[] = [
  {
    id: "1",
    memberId: "mem-001",
    memberName: "Alice Johnson",
    reason: "Late book return",
    amount: 5.5,
    dueDate: "2024-02-15",
    status: "pending",
    issuedAt: "2024-01-15",
    paidAt: null,
  },
  {
    id: "2",
    memberId: "mem-002",
    memberName: "Bob Smith",
    reason: "Damaged item",
    amount: 25.0,
    dueDate: "2024-01-20",
    status: "overdue",
    issuedAt: "2024-01-05",
    paidAt: null,
  },
  {
    id: "3",
    memberId: "mem-003",
    memberName: "Carol White",
    reason: "Lost book",
    amount: 45.0,
    dueDate: "2024-02-01",
    status: "paid",
    issuedAt: "2024-01-10",
    paidAt: "2024-01-28",
  },
  {
    id: "4",
    memberId: "mem-004",
    memberName: "David Brown",
    reason: "Late return",
    amount: 3.0,
    dueDate: "2024-02-20",
    status: "waived",
    issuedAt: "2024-01-20",
    paidAt: null,
  },
];

const IssueFineModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (fine: Omit<Fine, "id" | "issuedAt" | "paidAt">) => void;
}) => {
  const [form, setForm] = useState({
    memberId: "",
    memberName: "",
    reason: "",
    amount: "",
    dueDate: "",
    status: "pending" as Fine["status"],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.memberId.trim()) newErrors.memberId = "Member ID is required";
    if (!form.memberName.trim())
      newErrors.memberName = "Member name is required";
    if (!form.reason.trim()) newErrors.reason = "Reason is required";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      newErrors.amount = "Valid amount is required";
    if (!form.dueDate) newErrors.dueDate = "Due date is required";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit({
      memberId: form.memberId,
      memberName: form.memberName,
      reason: form.reason,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      status: "pending",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Issue New Fine</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member ID
            </label>
            <input
              type="text"
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. mem-001"
            />
            {errors.memberId && (
              <p className="text-red-500 text-xs mt-1">{errors.memberId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Name
            </label>
            <input
              type="text"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
            />
            {errors.memberName && (
              <p className="text-red-500 text-xs mt-1">{errors.memberName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Late book return"
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.dueDate && (
              <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Issue Fine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const statusConfig: Record<
  Fine["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
  waived: { label: "Waived", className: "bg-gray-100 text-gray-600" },
};

export default function FineLedger() {
  const [fines, setFines] = useState<Fine[]>(mockFines);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Fine["status"] | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredFines = fines.filter((fine) => {
    const matchesStatus =
      filterStatus === "all" || fine.status === filterStatus;
    const matchesSearch =
      fine.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPending = fines
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .reduce((sum, f) => sum + f.amount, 0);

  const totalCollected = fines
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amount, 0);

  const handlePayFine = async (fineId: string) => {
    setProcessingId(fineId);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setFines((prev) =>
      prev.map((f) =>
        f.id === fineId
          ? {
              ...f,
              status: "paid",
              paidAt: new Date().toISOString().split("T")[0],
            }
          : f,
      ),
    );
    setProcessingId(null);
  };

  const handleWaiveFine = async (fineId: string) => {
    setProcessingId(fineId);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setFines((prev) =>
      prev.map((f) => (f.id === fineId ? { ...f, status: "waived" } : f)),
    );
    setProcessingId(null);
  };

  const handleIssueFine = (
    fineData: Omit<Fine, "id" | "issuedAt" | "paidAt">,
  ) => {
    const newFine: Fine = {
      ...fineData,
      id: `fine-${Date.now()}`,
      issuedAt: new Date().toISOString().split("T")[0],
      paidAt: null,
    };
    setFines((prev) => [newFine, ...prev]);
    setShowIssueModal(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Fine Ledger</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage member fines and payments
            </p>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Issue Fine
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">
              Outstanding
            </p>
            <p className="text-lg font-bold text-yellow-900 mt-1">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
              Collected
            </p>
            <p className="text-lg font-bold text-green-900 mt-1">
              {formatCurrency(totalCollected)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
              Overdue
            </p>
            <p className="text-lg font-bold text-red-900 mt-1">
              {fines.filter((f) => f.status === "overdue").length}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
              Total Fines
            </p>
            <p className="text-lg font-bold text-blue-900 mt-1">
              {fines.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by member or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as Fine["status"] | "all")
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Reason
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Due Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Issued
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">No fines found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFines.map((fine) => {
                const isProcessing = processingId === fine.id;
                const config = statusConfig[fine.status];
                return (
                  <tr
                    key={fine.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {fine.memberName}
                        </p>
                        <p className="text-xs text-gray-400">{fine.memberId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{fine.reason}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(fine.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">
                        {formatDate(fine.dueDate)}
                      </p>
                      {fine.paidAt && (
                        <p className="text-xs text-green-600">
                          Paid {formatDate(fine.paidAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {formatDate(fine.issuedAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {(fine.status === "pending" ||
                          fine.status === "overdue") && (
                          <>
                            <button
                              onClick={() => handlePayFine(fine.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? (
                                <svg
                                  className="w-3 h-3 animate-spin"
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
                              ) : (
                                <svg
                                  className="w-3 h-3"
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
                              )}
                              Pay
                            </button>
                            <button
                              onClick={() => handleWaiveFine(fine.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Waive
                            </button>
                          </>
                        )}
                        {fine.status === "paid" && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
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
                            Settled
                          </span>
                        )}
                        {fine.status === "waived" && (
                          <span className="text-xs text-gray-400 font-medium">
                            Waived
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">
          Showing {filteredFines.length} of {fines.length} fines
        </p>
      </div>

      {showIssueModal && (
        <IssueFineModal
          onClose={() => setShowIssueModal(false)}
          onSubmit={handleIssueFine}
        />
      )}
    </div>
  );
}
