"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  address: string;
}

interface Category {
  id: string;
  name: string;
}

const VIOLATION_CATEGORIES: Category[] = [
  { id: "noise", name: "Noise Complaint" },
  { id: "parking", name: "Parking Violation" },
  { id: "property_maintenance", name: "Property Maintenance" },
  { id: "landscaping", name: "Landscaping" },
  { id: "trash", name: "Trash / Debris" },
  { id: "pets", name: "Pets / Animals" },
  { id: "structural", name: "Structural Damage" },
  { id: "signage", name: "Unauthorized Signage" },
  { id: "other", name: "Other" },
];

interface NewViolationClientProps {
  properties: Property[];
}

export default function NewViolationClient({
  properties,
}: NewViolationClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        photo: "Please select a valid image file.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        photo: "Image must be less than 10MB.",
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });

    setPhotoFile(file);
    setUploadedPhotoUrl(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload photo.");
      }

      const data = await res.json();
      return data.url as string;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Photo upload failed.";
      setErrors((prev) => ({ ...prev, photo: message }));
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!propertyId) newErrors.propertyId = "Please select a property.";
    if (!category) newErrors.category = "Please select a category.";
    if (!description.trim()) {
      newErrors.description = "Please provide a description.";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters.";
    } else if (description.trim().length > 2000) {
      newErrors.description = "Description must be 2000 characters or fewer.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let photoUrl = uploadedPhotoUrl;

      if (photoFile && !uploadedPhotoUrl) {
        photoUrl = await uploadPhoto();
        if (photoFile && !photoUrl) {
          setIsSubmitting(false);
          return;
        }
        setUploadedPhotoUrl(photoUrl);
      }

      const payload: Record<string, unknown> = {
        propertyId,
        category,
        description: description.trim(),
      };

      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }

      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit violation.");
      }

      const data = await res.json();
      const violationId = data.id || data.violation?.id;

      if (violationId) {
        router.push(`/violations/${violationId}`);
      } else {
        router.push("/violations");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isUploading || isSubmitting;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Report a Violation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill out the form below to report a new HOA violation.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Property Selector */}
        <div>
          <label
            htmlFor="propertyId"
            className="block text-sm font-medium text-gray-700"
          >
            Property <span className="text-red-500">*</span>
          </label>
          <select
            id="propertyId"
            name="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.propertyId
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
          >
            <option value="">Select a property...</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.address}
              </option>
            ))}
          </select>
          {errors.propertyId && (
            <p className="mt-1 text-sm text-red-600">{errors.propertyId}</p>
          )}
        </div>

        {/* Category Selector */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.category
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
          >
            <option value="">Select a category...</option>
            {VIOLATION_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            placeholder="Describe the violation in detail..."
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y ${
              errors.description
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
          />
          <div className="mt-1 flex justify-between">
            {errors.description ? (
              <p className="text-sm text-red-600">{errors.description}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-400">{description.length} / 2000</p>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>

          {!photoPreview ? (
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                errors.photo
                  ? "border-red-300"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="photo"
                    className={`relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${
                      isLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>Upload a photo</span>
                    <input
                      id="photo"
                      name="photo"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      disabled={isLoading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF, WEBP up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-1 relative">
              <img
                src={photoPreview}
                alt="Violation photo preview"
                className="w-full max-h-64 object-cover rounded-md border border-gray-300"
              />
              <button
                type="button"
                onClick={removePhoto}
                disabled={isLoading}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove photo"
              >
                <svg
                  className="h-5 w-5 text-gray-600"
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
              {uploadedPhotoUrl && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Uploaded
                </div>
              )}
            </div>
          )}

          {errors.photo && (
            <p className="mt-1 text-sm text-red-600">{errors.photo}</p>
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Uploading photo...
              </>
            ) : isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              "Submit Violation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
