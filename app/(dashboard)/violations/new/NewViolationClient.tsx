"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const violationSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  inspector_id: z.string().min(1, "Inspector is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  cure_deadline: z.string().min(1, "Cure deadline is required"),
});

type ViolationFormData = z.infer<typeof violationSchema>;

type FieldErrors = Partial<Record<keyof ViolationFormData, string>>;

interface Property {
  id: string;
  address: string;
  name?: string;
}

interface Inspector {
  id: string;
  name: string;
  email: string;
}

const VIOLATION_CATEGORIES = [
  "Building Code",
  "Fire Safety",
  "Health & Sanitation",
  "Zoning",
  "Electrical",
  "Plumbing",
  "Structural",
  "Environmental",
  "Accessibility",
  "Other",
];

export default function NewViolationClient() {
  const router = useRouter();

  const [formData, setFormData] = useState<ViolationFormData>({
    property_id: "",
    category: "",
    inspector_id: "",
    description: "",
    cure_deadline: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [propertiesRes, inspectorsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/inspectors"),
        ]);

        if (!propertiesRes.ok) {
          throw new Error("Failed to load properties");
        }
        if (!inspectorsRes.ok) {
          throw new Error("Failed to load inspectors");
        }

        const propertiesData = await propertiesRes.json();
        const inspectorsData = await inspectorsRes.json();

        setProperties(propertiesData.properties || propertiesData || []);
        setInspectors(inspectorsData.inspectors || inspectorsData || []);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load form data",
        );
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof ViolationFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const parseResult = violationSchema.safeParse(formData);
    if (!parseResult.success) {
      const errors: FieldErrors = {};
      parseResult.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ViolationFormData;
        if (field && !errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to create violation",
        );
      }

      router.push("/violations");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>Loading form data...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Error loading form
            </h3>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Violation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill out the form below to record a new property violation.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Submission failed
              </h3>
              <p className="mt-1 text-sm text-red-700">{serverError}</p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 bg-white shadow-sm rounded-lg border border-gray-200 p-6"
      >
        {/* Property Select */}
        <div>
          <label
            htmlFor="property_id"
            className="block text-sm font-medium text-gray-700"
          >
            Property <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <select
              id="property_id"
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.property_id
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              aria-describedby={
                fieldErrors.property_id ? "property_id-error" : undefined
              }
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name
                    ? `${property.name} — ${property.address}`
                    : property.address}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.property_id && (
            <p id="property_id-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.property_id}
            </p>
          )}
          {properties.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No properties available.
            </p>
          )}
        </div>

        {/* Category Select */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.category
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              aria-describedby={
                fieldErrors.category ? "category-error" : undefined
              }
            >
              <option value="">Select a category...</option>
              {VIOLATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.category && (
            <p id="category-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.category}
            </p>
          )}
        </div>

        {/* Inspector Select */}
        <div>
          <label
            htmlFor="inspector_id"
            className="block text-sm font-medium text-gray-700"
          >
            Inspector <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <select
              id="inspector_id"
              name="inspector_id"
              value={formData.inspector_id}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.inspector_id
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              aria-describedby={
                fieldErrors.inspector_id ? "inspector_id-error" : undefined
              }
            >
              <option value="">Select an inspector...</option>
              {inspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.name} ({inspector.email})
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.inspector_id && (
            <p id="inspector_id-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.inspector_id}
            </p>
          )}
          {inspectors.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No inspectors available.
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
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the violation in detail..."
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                fieldErrors.description
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              aria-describedby={
                fieldErrors.description ? "description-error" : undefined
              }
            />
          </div>
          {fieldErrors.description && (
            <p id="description-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.description}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {formData.description.length} characters
          </p>
        </div>

        {/* Cure Deadline Date Input */}
        <div>
          <label
            htmlFor="cure_deadline"
            className="block text-sm font-medium text-gray-700"
          >
            Cure Deadline <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="date"
              id="cure_deadline"
              name="cure_deadline"
              value={formData.cure_deadline}
              min={today}
              onChange={handleChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.cure_deadline
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              aria-describedby={
                fieldErrors.cure_deadline ? "cure_deadline-error" : undefined
              }
            />
          </div>
          {fieldErrors.cure_deadline && (
            <p id="cure_deadline-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.cure_deadline}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push("/violations")}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
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
            )}
            {isSubmitting ? "Submitting..." : "Create Violation"}
          </button>
        </div>
      </form>
    </div>
  );
}
