"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  address: string;
}

interface NewViolationFormProps {
  properties: Property[];
}

const VIOLATION_CATEGORIES = [
  "Noise Complaint",
  "Parking Violation",
  "Property Damage",
  "Unauthorized Pet",
  "Lease Violation",
  "Safety Hazard",
  "Trash/Debris",
  "Unauthorized Occupant",
  "HOA Rule Violation",
  "Other",
];

export default function NewViolationForm({
  properties,
}: NewViolationFormProps) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!propertyId) errors.propertyId = "Please select a property.";
    if (!category) errors.category = "Please select a violation category.";
    if (!description.trim()) errors.description = "Description is required.";
    if (description.trim().length < 10)
      errors.description = "Description must be at least 10 characters.";
    if (photoUrl && !/^https?:\/\/.+/.test(photoUrl))
      errors.photoUrl =
        "Photo URL must be a valid URL starting with http:// or https://.";
    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          category,
          description: description.trim(),
          photoUrl: photoUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Request failed with status ${res.status}`,
        );
      }

      router.push("/dashboard/violations");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl"
    >
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Property Selector */}
      <div>
        <label
          htmlFor="propertyId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Property <span className="text-red-500">*</span>
        </label>
        <select
          id="propertyId"
          name="propertyId"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.propertyId
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300"
          }`}
          aria-describedby={
            fieldErrors.propertyId ? "propertyId-error" : undefined
          }
        >
          <option value="">— Select a property —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address}
            </option>
          ))}
        </select>
        {fieldErrors.propertyId && (
          <p id="propertyId-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.propertyId}
          </p>
        )}
      </div>

      {/* Violation Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Violation Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.category
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300"
          }`}
          aria-describedby={fieldErrors.category ? "category-error" : undefined}
        >
          <option value="">— Select a category —</option>
          {VIOLATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {fieldErrors.category && (
          <p id="category-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.category}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the violation in detail…"
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
            fieldErrors.description
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300"
          }`}
          aria-describedby={
            fieldErrors.description ? "description-error" : undefined
          }
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Photo URL */}
      <div>
        <label
          htmlFor="photoUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Photo URL{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="photoUrl"
          name="photoUrl"
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.photoUrl
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-300"
          }`}
          aria-describedby={fieldErrors.photoUrl ? "photoUrl-error" : undefined}
        />
        {fieldErrors.photoUrl && (
          <p id="photoUrl-error" className="mt-1 text-xs text-red-600">
            {fieldErrors.photoUrl}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Submitting…
            </>
          ) : (
            "Submit Violation"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
