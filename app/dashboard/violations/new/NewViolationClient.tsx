"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const violationSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

type ViolationFormData = z.infer<typeof violationSchema>;

interface Property {
  id: string;
  address: string;
  unit?: string;
}

interface FormErrors {
  propertyId?: string;
  category?: string;
  description?: string;
  severity?: string;
  photo?: string;
  general?: string;
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
  "Landscaping",
  "Other",
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-green-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-red-600" },
];

interface NewViolationClientProps {
  properties: Property[];
}

export default function NewViolationClient({
  properties,
}: NewViolationClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ViolationFormData>({
    propertyId: "",
    category: "",
    description: "",
    severity: "medium",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        photo: "Please select a valid image file",
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: "Image must be less than 10MB" }));
      return;
    }
    setPhotoFile(file);
    setErrors((prev) => ({ ...prev, photo: undefined }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    setUploadProgress(10);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    setUploadProgress(80);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Failed to upload photo");
    }

    const data = await response.json();
    setUploadProgress(100);
    return data.url;
  };

  const validateForm = (): boolean => {
    const result = violationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (uploadError) {
          setErrors({
            photo:
              uploadError instanceof Error
                ? uploadError.message
                : "Upload failed",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        ...(photoUrl && { photoUrl }),
      };

      const response = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Submission failed" }));
        throw new Error(error.error || "Failed to submit violation");
      }

      const data = await response.json();
      router.push(`/dashboard/violations/${data.id}`);
      router.refresh();
    } catch (err) {
      setErrors({
        general:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Violation Details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below to report a new violation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
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
                <p className="ml-3 text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Property Selection */}
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
              value={formData.propertyId}
              onChange={handleInputChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.propertyId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address}
                  {property.unit ? ` - Unit ${property.unit}` : ""}
                </option>
              ))}
            </select>
            {errors.propertyId && (
              <p className="mt-1 text-xs text-red-600">{errors.propertyId}</p>
            )}
          </div>

          {/* Category */}
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
              onChange={handleInputChange}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
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

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {SEVERITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                    formData.severity === option.value
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={option.value}
                    checked={formData.severity === option.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.severity && (
              <p className="mt-1 text-xs text-red-600">{errors.severity}</p>
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
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the violation in detail..."
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.description
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            />
            <div className="mt-1 flex justify-between">
              {errors.description ? (
                <p className="text-xs text-red-600">{errors.description}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">
                {formData.description.length} characters
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo Evidence{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={photoPreview}
                  alt="Violation preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="h-4 w-4 text-gray-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 px-3 py-2">
                  <p className="text-white text-xs truncate">
                    {photoFile?.name}
                  </p>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="h-10 w-10 text-gray-400 mb-3"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF, WEBP up to 10MB
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {errors.photo && (
              <p className="mt-1 text-xs text-red-600">{errors.photo}</p>
            )}
          </div>

          {/* Upload Progress */}
          {isSubmitting &&
            photoFile &&
            uploadProgress > 0 &&
            uploadProgress < 100 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading photo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 14 6.373 14 12h-4z"
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
    </div>
  );
}
