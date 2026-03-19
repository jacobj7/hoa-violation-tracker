"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

interface Property {
  id: number;
  name: string;
  address: string;
}

interface ViolationType {
  id: number;
  name: string;
  description: string;
}

export default function NewViolationForm() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedViolationType, setSelectedViolationType] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingViolationTypes, setLoadingViolationTypes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data);
      } catch (err) {
        setErrorMessage("Failed to load properties. Please refresh the page.");
      } finally {
        setLoadingProperties(false);
      }
    }

    async function fetchViolationTypes() {
      try {
        const res = await fetch("/api/violation-types");
        if (!res.ok) throw new Error("Failed to fetch violation types");
        const data = await res.json();
        setViolationTypes(data);
      } catch (err) {
        setErrorMessage(
          "Failed to load violation types. Please refresh the page.",
        );
      } finally {
        setLoadingViolationTypes(false);
      }
    }

    fetchProperties();
    fetchViolationTypes();
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  function resetForm() {
    setSelectedProperty("");
    setSelectedViolationType("");
    setNotes("");
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!selectedProperty) {
      setErrorMessage("Please select a property.");
      return;
    }
    if (!selectedViolationType) {
      setErrorMessage("Please select a violation type.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("propertyId", selectedProperty);
      formData.append("violationTypeId", selectedViolationType);
      formData.append("notes", notes);
      if (photo) {
        formData.append("photo", photo);
      }

      const res = await fetch("/api/violations", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || data.error || "Failed to submit violation report.",
        );
      }

      setSuccessMessage("Violation report submitted successfully!");
      resetForm();
    } catch (err: any) {
      setErrorMessage(
        err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = loadingProperties || loadingViolationTypes;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Report a New Violation
      </h2>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-green-700 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-700 text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selector */}
        <div>
          <label
            htmlFor="property"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Property <span className="text-red-500">*</span>
          </label>
          {loadingProperties ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              id="property"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} — {property.address}
                </option>
              ))}
            </select>
          )}
          {!loadingProperties && properties.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No properties available.
            </p>
          )}
        </div>

        {/* Violation Type Selector */}
        <div>
          <label
            htmlFor="violationType"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Violation Type <span className="text-red-500">*</span>
          </label>
          {loadingViolationTypes ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              id="violationType"
              value={selectedViolationType}
              onChange={(e) => setSelectedViolationType(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <option value="">Select a violation type...</option>
              {violationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
          {!loadingViolationTypes && selectedViolationType && (
            <p className="mt-1 text-xs text-gray-500">
              {
                violationTypes.find(
                  (t) => String(t.id) === selectedViolationType,
                )?.description
              }
            </p>
          )}
          {!loadingViolationTypes && violationTypes.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No violation types available.
            </p>
          )}
        </div>

        {/* Notes Textarea */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            rows={4}
            placeholder="Describe the violation in detail..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition resize-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            {notes.length} characters
          </p>
        </div>

        {/* Photo Upload */}
        <div>
          <label
            htmlFor="photo"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Photo Evidence
          </label>
          <div className="mt-1">
            <label
              htmlFor="photo"
              className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition ${
                isSubmitting
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400"
              }`}
            >
              {photoPreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg p-1"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <svg
                    className="w-8 h-8 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-blue-600">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </div>
              )}
              <input
                id="photo"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoChange}
                disabled={isSubmitting}
                className="hidden"
              />
            </label>
          </div>
          {photo && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500 truncate max-w-xs">
                {photo.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isSubmitting}
                className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting...
              </>
            ) : (
              "Submit Violation Report"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
