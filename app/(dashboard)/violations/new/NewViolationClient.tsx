"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: number;
  address: string;
  unit_number?: string;
}

const VIOLATION_TYPES = [
  "Noise Complaint",
  "Parking Violation",
  "Pet Policy Violation",
  "Lease Violation",
  "Property Damage",
  "Unauthorized Occupant",
  "Trash/Recycling Violation",
  "Smoking Violation",
  "HOA Rule Violation",
  "Other",
];

export default function NewViolationClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [violationType, setViolationType] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) {
          throw new Error("Failed to load properties");
        }
        const data = await res.json();
        setProperties(data.properties ?? data ?? []);
      } catch (err: unknown) {
        setPropertiesError(
          err instanceof Error ? err.message : "Failed to load properties",
        );
      } finally {
        setLoadingProperties(false);
      }
    }
    fetchProperties();
  }, []);

  function validate() {
    const errors: Record<string, string> = {};
    if (!propertyId) {
      errors.propertyId = "Please select a property.";
    }
    if (!violationType) {
      errors.violationType = "Please select a violation type.";
    }
    if (!description.trim()) {
      errors.description = "Description is required.";
    } else if (description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: Number(propertyId),
          violation_type: violationType,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? data.message ?? "Failed to create violation",
        );
      }

      router.push("/violations");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Report New Violation
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill out the form below to report a property violation.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 bg-white shadow rounded-lg p-6"
      >
        {/* Property Select */}
        <div>
          <label
            htmlFor="propertyId"
            className="block text-sm font-medium text-gray-700"
          >
            Property <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            {loadingProperties ? (
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            ) : propertiesError ? (
              <p className="text-sm text-red-600">{propertiesError}</p>
            ) : (
              <select
                id="propertyId"
                name="propertyId"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={submitting}
                className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.propertyId
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300"
                } disabled:bg-gray-50 disabled:text-gray-500`}
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                    {p.unit_number ? ` — Unit ${p.unit_number}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {fieldErrors.propertyId && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.propertyId}
            </p>
          )}
        </div>

        {/* Violation Type Select */}
        <div>
          <label
            htmlFor="violationType"
            className="block text-sm font-medium text-gray-700"
          >
            Violation Type <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <select
              id="violationType"
              name="violationType"
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
              disabled={submitting}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.violationType
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300"
              } disabled:bg-gray-50 disabled:text-gray-500`}
            >
              <option value="">Select a violation type…</option>
              {VIOLATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.violationType && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.violationType}
            </p>
          )}
        </div>

        {/* Description Textarea */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              name="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              placeholder="Describe the violation in detail…"
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                fieldErrors.description
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300"
              } disabled:bg-gray-50 disabled:text-gray-500`}
            />
          </div>
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.description}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {description.trim().length} characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/violations")}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingProperties}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Violation"}
          </button>
        </div>
      </form>
    </div>
  );
}
