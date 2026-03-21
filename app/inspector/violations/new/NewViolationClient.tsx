"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: number;
  address: string;
  owner_name: string;
}

const VIOLATION_TYPES = [
  "Unsafe Structure",
  "Code Violation",
  "Zoning Violation",
  "Fire Hazard",
  "Electrical Hazard",
  "Plumbing Issue",
  "Pest Infestation",
  "Illegal Construction",
  "Noise Violation",
  "Sanitation Issue",
  "Other",
];

export default function NewViolationClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    property_id: "",
    violation_type: "",
    description: "",
    photo_url: "",
    observed_date: new Date().toISOString().split("T")[0],
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data.properties || data || []);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError("Failed to load properties. Please refresh the page.");
      } finally {
        setLoadingProperties(false);
      }
    }
    fetchProperties();
  }, []);

  function validate() {
    const errors: Record<string, string> = {};

    if (!formData.property_id) {
      errors.property_id = "Please select a property.";
    }
    if (!formData.violation_type) {
      errors.violation_type = "Please select a violation type.";
    }
    if (!formData.description.trim()) {
      errors.description = "Description is required.";
    } else if (formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters.";
    }
    if (formData.photo_url && !/^https?:\/\/.+/.test(formData.photo_url)) {
      errors.photo_url =
        "Photo URL must be a valid URL starting with http:// or https://";
    }
    if (!formData.observed_date) {
      errors.observed_date = "Observed date is required.";
    } else {
      const date = new Date(formData.observed_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(date.getTime())) {
        errors.observed_date = "Please enter a valid date.";
      } else if (date > today) {
        errors.observed_date = "Observed date cannot be in the future.";
      }
    }

    return errors;
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        property_id: parseInt(formData.property_id, 10),
        violation_type: formData.violation_type,
        description: formData.description.trim(),
        photo_url: formData.photo_url.trim() || null,
        observed_date: formData.observed_date,
      };

      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || data.message || "Failed to submit violation report.",
        );
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/inspector/violations");
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setFormData({
      property_id: "",
      violation_type: "",
      description: "",
      photo_url: "",
      observed_date: new Date().toISOString().split("T")[0],
    });
    setFieldErrors({});
    setError(null);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Violation Reported
          </h2>
          <p className="text-gray-600">
            Your violation report has been submitted successfully.
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            New Violation Report
          </h1>
          <p className="text-gray-500 mt-1">
            Document a property violation for inspection and follow-up.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
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
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-6">
              {/* Property Selection */}
              <div>
                <label
                  htmlFor="property_id"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Property <span className="text-red-500">*</span>
                </label>
                {loadingProperties ? (
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <select
                    id="property_id"
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.property_id
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <option value="">Select a property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address}
                        {p.owner_name ? ` — ${p.owner_name}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {fieldErrors.property_id && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.property_id}
                  </p>
                )}
              </div>

              {/* Violation Type */}
              <div>
                <label
                  htmlFor="violation_type"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Violation Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="violation_type"
                  name="violation_type"
                  value={formData.violation_type}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.violation_type
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <option value="">Select violation type...</option>
                  {VIOLATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {fieldErrors.violation_type && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.violation_type}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the violation in detail, including location on the property, severity, and any immediate hazards..."
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    fieldErrors.description
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                <div className="flex justify-between items-center mt-1.5">
                  {fieldErrors.description ? (
                    <p className="text-xs text-red-600">
                      {fieldErrors.description}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formData.description.length} chars
                  </span>
                </div>
              </div>

              {/* Photo URL */}
              <div>
                <label
                  htmlFor="photo_url"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Photo URL{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    type="url"
                    id="photo_url"
                    name="photo_url"
                    value={formData.photo_url}
                    onChange={handleChange}
                    placeholder="https://example.com/photo.jpg"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.photo_url
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  />
                </div>
                {fieldErrors.photo_url && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.photo_url}
                  </p>
                )}
                {formData.photo_url && !fieldErrors.photo_url && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Valid URL
                  </p>
                )}
              </div>

              {/* Observed Date */}
              <div>
                <label
                  htmlFor="observed_date"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Observed Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="observed_date"
                  name="observed_date"
                  value={formData.observed_date}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.observed_date
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                {fieldErrors.observed_date && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {fieldErrors.observed_date}
                  </p>
                )}
              </div>
            </div>

            {/* Form Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Reset
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loadingProperties}
                  className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
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
                    <>
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
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Helper Note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Fields marked with <span className="text-red-500">*</span> are
          required.
        </p>
      </div>
    </div>
  );
}
