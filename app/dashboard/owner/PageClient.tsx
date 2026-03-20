"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Violation {
  id: string;
  property_address: string;
  violation_type: string;
  description: string;
  fine_amount: number;
  status: "pending" | "paid" | "appealed" | "dismissed";
  created_at: string;
  due_date: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  violations: Violation[];
  total_fines: number;
  unpaid_fines: number;
}

interface AppealFormData {
  violation_id: string;
  reason: string;
}

function ViolationTable({
  violations,
  onAppeal,
}: {
  violations: Violation[];
  onAppeal: (violationId: string) => void;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    appealed: "bg-blue-100 text-blue-800",
    dismissed: "bg-gray-100 text-gray-800",
  };

  if (violations.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-2">
        No violations for this property.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Fine
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {violations.map((violation) => (
            <tr key={violation.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {violation.violation_type}
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                {violation.description}
              </td>
              <td className="px-4 py-3 text-gray-900 font-medium">
                ${violation.fine_amount.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[violation.status] ||
                    "bg-gray-100 text-gray-800"
                  }`}
                >
                  {violation.status.charAt(0).toUpperCase() +
                    violation.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(violation.due_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {violation.status === "pending" && (
                  <button
                    onClick={() => onAppeal(violation.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                  >
                    Submit Appeal
                  </button>
                )}
                {violation.status === "appealed" && (
                  <span className="text-gray-400 text-sm">Appeal Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppealModal({
  violationId,
  onClose,
  onSubmit,
}: {
  violationId: string;
  onClose: () => void;
  onSubmit: (data: AppealFormData) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for your appeal.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ violation_id: violationId, reason });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit appeal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Submit Appeal
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Provide a detailed reason for appealing this violation. Our team will
          review your appeal and respond within 5-7 business days.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Appeal Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Explain why you believe this violation should be dismissed or reduced..."
              disabled={submitting}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
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
                  Submitting...
                </>
              ) : (
                "Submit Appeal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OwnerDashboardClient() {
  const { data: session } = useSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appealViolationId, setAppealViolationId] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/properties");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch properties");
      }
      const data = await res.json();
      setProperties(data.properties || []);
      const allIds = new Set<string>(
        (data.properties || []).map((p: Property) => p.id),
      );
      setExpandedProperties(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAppealSubmit = async (formData: AppealFormData) => {
    const res = await fetch("/api/owner/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to submit appeal");
    }
    setSuccessMessage("Your appeal has been submitted successfully.");
    setTimeout(() => setSuccessMessage(null), 5000);
    await fetchProperties();
  };

  const toggleProperty = (propertyId: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  const totalUnpaidFines = properties.reduce(
    (sum, p) => sum + p.unpaid_fines,
    0,
  );
  const totalFines = properties.reduce((sum, p) => sum + p.total_fines, 0);
  const totalViolations = properties.reduce(
    (sum, p) => sum + p.violations.length,
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
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
          <p className="text-gray-600">Loading your properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome back,{" "}
            <span className="font-medium">
              {session?.user?.name || "Owner"}
            </span>
            . Manage your properties and violations below.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600 flex-shrink-0"
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
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={fetchProperties}
              className="ml-auto text-sm text-red-700 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">
              Total Properties
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {properties.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">
              Total Violations
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalViolations}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">
              Outstanding Balance
            </p>
            <p
              className={`mt-1 text-3xl font-bold ${
                totalUnpaidFines > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              ${totalUnpaidFines.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              of ${totalFines.toFixed(2)} total
            </p>
          </div>
        </div>

        {/* Properties List */}
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No properties found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have any properties registered yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Property Header */}
                <button
                  onClick={() => toggleProperty(property.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4 text-left">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-blue-600"
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
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {property.address}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {property.city}, {property.state} {property.zip}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Violations</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {property.violations.length}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Unpaid Fines</p>
                      <p
                        className={`text-sm font-semibold ${
                          property.unpaid_fines > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ${property.unpaid_fines.toFixed(2)}
                      </p>
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedProperties.has(property.id) ? "rotate-180" : ""
                      }`}
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
                  </div>
                </button>

                {/* Fine Balance Bar */}
                {property.total_fines > 0 && (
                  <div className="px-6 pb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Fine Balance</span>
                      <span>
                        ${property.unpaid_fines.toFixed(2)} / $
                        {property.total_fines.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          property.unpaid_fines > 0
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${
                            property.total_fines > 0
                              ? (property.unpaid_fines / property.total_fines) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Violations Table */}
                {expandedProperties.has(property.id) && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 mt-2">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Violations
                    </h3>
                    <ViolationTable
                      violations={property.violations}
                      onAppeal={(violationId) =>
                        setAppealViolationId(violationId)
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      {appealViolationId && (
        <AppealModal
          violationId={appealViolationId}
          onClose={() => setAppealViolationId(null)}
          onSubmit={handleAppealSubmit}
        />
      )}
    </div>
  );
}
