"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  name: string;
  address: string;
}

interface NewViolationFormProps {
  properties: Property[];
}

const CATEGORIES = [
  "Noise Complaint",
  "Parking Violation",
  "Property Damage",
  "Unauthorized Pet",
  "Lease Violation",
  "Safety Hazard",
  "Trash/Debris",
  "Landscaping",
  "Other",
];

const SEVERITIES = [
  { value: "low", label: "Low", color: "text-green-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-red-600" },
];

export default function NewViolationForm({
  properties,
}: NewViolationFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    propertyId: "",
    category: "",
    description: "",
    severity: "medium",
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.propertyId) newErrors.propertyId = "Please select a property";
    if (!formData.category) newErrors.category = "Please select a category";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (formData.description.trim().length < 10)
      newErrors.description = "Description must be at least 10 characters";
    if (!formData.severity)
      newErrors.severity = "Please select a severity level";
    return newErrors;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) return false;
      if (file.size > 10 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length !== files.length) {
      setErrors((prev) => ({
        ...prev,
        photos: "Some files were skipped. Only images under 10MB are allowed.",
      }));
    }

    setPhotos((prev) => [...prev, ...validFiles]);
    await uploadPhotos(validFiles);
  };

  const uploadPhotos = async (files: File[]) => {
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        uploadedUrls.push(data.url);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        setErrors((prev) => ({
          ...prev,
          photos: `Failed to upload ${file.name}. Please try again.`,
        }));
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[file.name];
          return updated;
        });
      }
    }

    setPhotoUrls((prev) => [...prev, ...uploadedUrls]);
    setUploadingPhotos(false);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (uploadingPhotos) {
      setErrors((prev) => ({
        ...prev,
        photos: "Please wait for photos to finish uploading.",
      }));
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          category: formData.category,
          description: formData.description.trim(),
          severity: formData.severity,
          photoUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit violation");
      }

      const data = await response.json();
      router.push(`/violations/${data.id}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to submit violation:", err);
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "Failed to submit violation. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          value={formData.propertyId}
          onChange={handleInputChange}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.propertyId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select a property...</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} — {property.address}
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
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.category ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Severity Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Severity <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEVERITIES.map((sev) => (
            <label
              key={sev.value}
              className={`flex items-center justify-center rounded-md border px-3 py-2 cursor-pointer text-sm font-medium transition-colors ${
                formData.severity === sev.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={sev.value}
                checked={formData.severity === sev.value}
                onChange={handleInputChange}
                className="sr-only"
              />
              <span
                className={formData.severity === sev.value ? "" : sev.color}
              >
                {sev.label}
              </span>
            </label>
          ))}
        </div>
        {errors.severity && (
          <p className="mt-1 text-sm text-red-600">{errors.severity}</p>
        )}
      </div>

      {/* Description Textarea */}
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
          onChange={handleInputChange}
          rows={5}
          placeholder="Describe the violation in detail..."
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
            errors.description ? "border-red-500" : "border-gray-300"
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">
            {formData.description.length} chars
          </span>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photos <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            if (fileInputRef.current) {
              const dt = new DataTransfer();
              files.forEach((f) => dt.items.add(f));
              fileInputRef.current.files = dt.files;
              handlePhotoChange({
                target: fileInputRef.current,
              } as ChangeEvent<HTMLInputElement>);
            }
          }}
        >
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">
            <span className="text-blue-600 font-medium">Click to upload</span>{" "}
            or drag and drop
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PNG, JPG, GIF, WEBP up to 10MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {errors.photos && (
          <p className="mt-1 text-sm text-red-600">{errors.photos}</p>
        )}

        {/* Photo Previews */}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => (
              <div key={`${photo.name}-${index}`} className="relative group">
                <div className="aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  {uploadProgress[photo.name] !== undefined &&
                    uploadProgress[photo.name] < 100 && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="text-white text-xs font-medium">
                          Uploading...
                        </div>
                      </div>
                    )}
                  {photoUrls[index] && (
                    <div className="absolute top-1 left-1">
                      <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">
                        ✓
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label={`Remove ${photo.name}`}
                >
                  ×
                </button>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {photo.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {uploadingPhotos && (
          <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
            <svg
              className="animate-spin h-4 w-4"
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
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Uploading photos...
          </p>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploadingPhotos}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {submitting && (
            <svg
              className="animate-spin h-4 w-4"
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
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
          {submitting ? "Submitting..." : "Submit Violation"}
        </button>
      </div>
    </form>
  );
}
