"use client";

import { useState } from "react";
import { z } from "zod";

const disputeSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
  evidenceUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type DisputeFormData = z.infer<typeof disputeSchema>;

interface DisputeModalProps {
  violationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisputeModal({
  violationId,
  onClose,
  onSuccess,
}: DisputeModalProps) {
  const [formData, setFormData] = useState<DisputeFormData>({
    description: "",
    evidenceUrl: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof DisputeFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const result = disputeSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof DisputeFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof DisputeFormData;
        if (field) {
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

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: Record<string, string> = {
        description: formData.description,
      };
      if (formData.evidenceUrl && formData.evidenceUrl.trim() !== "") {
        payload.evidenceUrl = formData.evidenceUrl;
      }

      const response = await fetch(`/api/violations/${violationId}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ||
            data.message ||
            `Request failed with status ${response.status}`,
        );
      }

      onSuccess();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="dispute-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Submit Dispute
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 py-5">
            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

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
                rows={5}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe why you are disputing this violation..."
                className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                  errors.description
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300"
                }`}
                aria-describedby={
                  errors.description ? "description-error" : undefined
                }
                disabled={isSubmitting}
              />
              {errors.description && (
                <p id="description-error" className="mt-1 text-xs text-red-600">
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/2000 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="evidenceUrl"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Evidence URL{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="evidenceUrl"
                name="evidenceUrl"
                type="url"
                value={formData.evidenceUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    evidenceUrl: e.target.value,
                  }))
                }
                placeholder="https://example.com/evidence"
                className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.evidenceUrl
                    ? "border-red-400 focus:ring-red-500"
                    : "border-gray-300"
                }`}
                aria-describedby={
                  errors.evidenceUrl ? "evidenceUrl-error" : undefined
                }
                disabled={isSubmitting}
              />
              {errors.evidenceUrl && (
                <p id="evidenceUrl-error" className="mt-1 text-xs text-red-600">
                  {errors.evidenceUrl}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg
                  className="h-4 w-4 animate-spin"
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
              {isSubmitting ? "Submitting..." : "Submit Dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
