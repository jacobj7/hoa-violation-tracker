"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ViolationStatusBadge from "@/components/ViolationStatusBadge";

interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  created_at: string;
  notes?: string;
}

interface Fine {
  id: string;
  amount: number;
  status: string;
  due_date: string;
}

interface Hearing {
  id: string;
  scheduled_at: string;
  location: string;
  status: string;
  notes?: string;
}

interface Inspection {
  id: string;
  scheduled_at: string;
  inspector: string;
  status: string;
  notes?: string;
}

interface Violation {
  id: string;
  property_id: string;
  property_address?: string;
  violation_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  reported_by?: string;
  fines?: Fine[];
  hearings?: Hearing[];
  inspections?: Inspection[];
  audit_entries?: AuditEntry[];
}

interface ViolationDetailProps {
  violation: Violation;
}

function CardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <CardSection title="Audit Trail">
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {entry.action}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500">By: {entry.performed_by}</p>
              {entry.notes && (
                <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </CardSection>
  );
}

export default function ViolationDetail({ violation }: ViolationDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fines = violation.fines || [];
  const hearings = violation.hearings || [];
  const inspections = violation.inspections || [];
  const auditEntries = violation.audit_entries || [];

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/violations/${violation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/violations"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Violations
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Violation #{violation.id.slice(0, 8)}
          </h1>
        </div>
        <ViolationStatusBadge status={violation.status} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      <CardSection title="Details">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Property</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {violation.property_address || violation.property_id}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Violation Type
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {violation.violation_type}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Reported By</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {violation.reported_by || "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(violation.created_at).toLocaleString()}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {violation.description}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          {violation.status !== "resolved" && (
            <button
              onClick={() => handleStatusUpdate("resolved")}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              Mark Resolved
            </button>
          )}
          {violation.status !== "closed" && (
            <button
              onClick={() => handleStatusUpdate("closed")}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Close
            </button>
          )}
        </div>
      </CardSection>

      <CardSection title="Fines">
        {fines.length === 0 ? (
          <p className="text-sm text-gray-500">No fines issued.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Due Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fines.map((fine) => (
                <tr key={fine.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    ${fine.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {new Date(fine.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {fine.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardSection>

      <CardSection title="Hearings">
        {hearings.length === 0 ? (
          <p className="text-sm text-gray-500">No hearings scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {hearings.map((hearing) => (
              <li key={hearing.id} className="border rounded p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    {new Date(hearing.scheduled_at).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {hearing.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{hearing.location}</p>
                {hearing.notes && (
                  <p className="text-sm text-gray-500 mt-1">{hearing.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardSection>

      <CardSection title="Inspections">
        {inspections.length === 0 ? (
          <p className="text-sm text-gray-500">No inspections scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {inspections.map((inspection) => (
              <li key={inspection.id} className="border rounded p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    {new Date(inspection.scheduled_at).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {inspection.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Inspector: {inspection.inspector}
                </p>
                {inspection.notes && (
                  <p className="text-sm text-gray-500 mt-1">
                    {inspection.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardSection>

      <AuditTrail entries={auditEntries} />
    </div>
  );
}
