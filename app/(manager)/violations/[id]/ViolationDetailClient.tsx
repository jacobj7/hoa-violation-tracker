"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Violation {
  id: number;
  property_address: string;
  owner_name: string;
  owner_email: string;
  violation_type: string;
  description: string;
  status: string;
  created_at: string;
  due_date?: string;
  fine_amount?: number;
  appeal_text?: string;
  appeal_date?: string;
}

interface ViolationDetailClientProps {
  violation: Violation;
}

export default function ViolationDetailClient({
  violation,
}: ViolationDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(violation.status);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/violations/${violation.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        setMessage("Status updated successfully.");
      } else {
        setMessage("Failed to update status.");
      }
    } catch {
      setMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16 }}>
        &larr; Back
      </button>
      <h1>Violation Detail</h1>
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}
      >
        <tbody>
          <tr>
            <td>
              <strong>ID</strong>
            </td>
            <td>{violation.id}</td>
          </tr>
          <tr>
            <td>
              <strong>Property</strong>
            </td>
            <td>{violation.property_address}</td>
          </tr>
          <tr>
            <td>
              <strong>Owner</strong>
            </td>
            <td>{violation.owner_name}</td>
          </tr>
          <tr>
            <td>
              <strong>Owner Email</strong>
            </td>
            <td>{violation.owner_email}</td>
          </tr>
          <tr>
            <td>
              <strong>Type</strong>
            </td>
            <td>{violation.violation_type}</td>
          </tr>
          <tr>
            <td>
              <strong>Description</strong>
            </td>
            <td>{violation.description}</td>
          </tr>
          <tr>
            <td>
              <strong>Status</strong>
            </td>
            <td>{status}</td>
          </tr>
          <tr>
            <td>
              <strong>Created</strong>
            </td>
            <td>{new Date(violation.created_at).toLocaleDateString()}</td>
          </tr>
          {violation.due_date && (
            <tr>
              <td>
                <strong>Due Date</strong>
              </td>
              <td>{new Date(violation.due_date).toLocaleDateString()}</td>
            </tr>
          )}
          {violation.fine_amount != null && (
            <tr>
              <td>
                <strong>Fine Amount</strong>
              </td>
              <td>${violation.fine_amount}</td>
            </tr>
          )}
          {violation.appeal_text && (
            <>
              <tr>
                <td>
                  <strong>Appeal</strong>
                </td>
                <td>{violation.appeal_text}</td>
              </tr>
              {violation.appeal_date && (
                <tr>
                  <td>
                    <strong>Appeal Date</strong>
                  </td>
                  <td>
                    {new Date(violation.appeal_date).toLocaleDateString()}
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>

      <h2>Update Status</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["open", "in_review", "resolved", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={loading || status === s}
            style={{
              padding: "8px 16px",
              background: status === s ? "#ccc" : undefined,
            }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
