"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: number;
  address: string;
  owner_name: string;
  owner_email: string;
}

interface ViolationType {
  id: number;
  name: string;
  default_fine?: number;
}

interface NewViolationClientProps {
  properties: Property[];
  violationTypes: ViolationType[];
}

export default function NewViolationClient({
  properties,
  violationTypes,
}: NewViolationClientProps) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState("");
  const [violationTypeId, setViolationTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: Number(propertyId),
          violation_type_id: Number(violationTypeId),
          description,
          due_date: dueDate || undefined,
          fine_amount: fineAmount ? Number(fineAmount) : undefined,
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create violation.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16 }}>
        &larr; Back
      </button>
      <h1>New Violation</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="property">Property</label>
          <br />
          <select
            id="property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address} — {p.owner_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="violationType">Violation Type</label>
          <br />
          <select
            id="violationType"
            value={violationTypeId}
            onChange={(e) => setViolationTypeId(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="">Select a type</option>
            {violationTypes.map((vt) => (
              <option key={vt.id} value={vt.id}>
                {vt.name}
                {vt.default_fine != null ? ` ($${vt.default_fine})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="description">Description</label>
          <br />
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="dueDate">Due Date (optional)</label>
          <br />
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="fineAmount">Fine Amount (optional)</label>
          <br />
          <input
            id="fineAmount"
            type="number"
            min="0"
            step="0.01"
            value={fineAmount}
            onChange={(e) => setFineAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 16px" }}
        >
          {loading ? "Creating..." : "Create Violation"}
        </button>
      </form>
    </div>
  );
}
