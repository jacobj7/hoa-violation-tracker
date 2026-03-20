"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const violationSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  notes: z.string().optional(),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ViolationFormData = z.infer<typeof violationSchema>;

type Property = {
  id: string;
  address: string;
  owner_name: string;
};

const VIOLATION_CATEGORIES = [
  "Building Code",
  "Fire Safety",
  "Electrical",
  "Plumbing",
  "Structural",
  "Zoning",
  "Health & Sanitation",
  "Accessibility",
  "Environmental",
  "Other",
];

export default function NewViolationClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ViolationFormData, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ViolationFormData>({
    propertyId: "",
    category: "",
    description: "",
    notes: "",
    photoUrl: "",
  });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data.properties || []);
      } catch (err) {
        console.error("Error fetching properties:", err);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ViolationFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError(null);
  };

  const validate = (): boolean => {
    const result = violationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ViolationFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ViolationFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        propertyId: formData.propertyId,
        category: formData.category,
        description: formData.description,
        notes: formData.notes || null,
        photoUrl: formData.photoUrl || null,
      };

      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create violation");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/inspector/violations");
      }, 1500);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Violation Reported
          </h2>
          <p className="text-gray-500">Redirecting to violations list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Report New Violation
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill out the form below to report a property violation.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
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
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white shadow-sm rounded-xl border border-gray-200 p-6"
      >
        {/* Property Selector */}
        <div>
          <label
            htmlFor="propertyId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Property <span className="text-red-500">*</span>
          </label>
          {loadingProperties ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                errors.propertyId ? "border-red-400" : "border-gray-300"
              }`}
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address} — {property.owner_name}
                </option>
              ))}
            </select>
          )}
          {errors.propertyId && (
            <p className="mt-1 text-xs text-red-600">{errors.propertyId}</p>
          )}
        </div>

        {/* Category Selector */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
              errors.category ? "border-red-400" : "border-gray-300"
            }`}
          >
            <option value="">Select a category...</option>
            {VIOLATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category}</p>
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
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the violation in detail..."
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.description ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Additional Notes
            <span className="ml-1 text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional notes or observations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Photo URL */}
        <div>
          <label
            htmlFor="photoUrl"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Photo URL
            <span className="ml-1 text-xs text-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            id="photoUrl"
            name="photoUrl"
            value={formData.photoUrl}
            onChange={handleChange}
            placeholder="https://example.com/photo.jpg"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.photoUrl ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.photoUrl && (
            <p className="mt-1 text-xs text-red-600">{errors.photoUrl}</p>
          )}
          {formData.photoUrl && !errors.photoUrl && (
            <div className="mt-2">
              <img
                src={formData.photoUrl}
                alt="Violation preview"
                className="h-32 w-auto rounded-lg border border-gray-200 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingProperties}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
              "Report Violation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
