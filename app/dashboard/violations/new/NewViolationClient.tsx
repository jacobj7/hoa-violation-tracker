"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  address: string;
  owner_name: string;
  unit_number?: string;
}

interface PropertySearchResult {
  properties: Property[];
}

const VIOLATION_TYPES = [
  "Noise Complaint",
  "Parking Violation",
  "Trash/Debris",
  "Unauthorized Pet",
  "Lease Violation",
  "Property Damage",
  "Unauthorized Occupant",
  "HOA Rule Violation",
  "Safety Hazard",
  "Other",
];

const SEVERITY_LEVELS = [
  {
    value: "low",
    label: "Low",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  {
    value: "medium",
    label: "Medium",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  {
    value: "high",
    label: "High",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    value: "critical",
    label: "Critical",
    color: "text-red-600 bg-red-50 border-red-200",
  },
];

export default function NewViolationClient() {
  const router = useRouter();

  const [propertySearch, setPropertySearch] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [violationType, setViolationType] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [incidentDate, setIncidentDate] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const searchProperties = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setProperties([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/properties?search=${encodeURIComponent(query)}&limit=10`,
      );
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data: PropertySearchResult = await res.json();
      setProperties(data.properties || []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Property search error:", err);
      setProperties([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertySearch && !selectedProperty) {
        searchProperties(propertySearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [propertySearch, selectedProperty, searchProperties]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setPropertySearch(property.address);
    setShowDropdown(false);
    setErrors((prev) => ({ ...prev, property: "" }));
  };

  const handlePropertySearchChange = (value: string) => {
    setPropertySearch(value);
    if (selectedProperty && value !== selectedProperty.address) {
      setSelectedProperty(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedProperty) {
      newErrors.property = "Please select a property from the search results";
    }
    if (!violationType) {
      newErrors.violationType = "Please select a violation type";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }
    if (!severity) {
      newErrors.severity = "Please select a severity level";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        property_id: selectedProperty!.id,
        violation_type: violationType,
        description: description.trim(),
        severity,
        incident_date: incidentDate || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to create violation",
        );
      }

      const data = await res.json();
      const violationId = data.violation?.id || data.id;

      if (violationId) {
        router.push(`/dashboard/violations/${violationId}`);
      } else {
        router.push("/dashboard/violations");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
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
          <h1 className="text-2xl font-bold text-gray-900">
            Report New Violation
          </h1>
          <p className="text-gray-500 mt-1">
            Fill out the form below to report a property violation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Property Information
            </h2>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={propertySearch}
                  onChange={(e) => handlePropertySearchChange(e.target.value)}
                  onFocus={() => {
                    if (properties.length > 0 && !selectedProperty)
                      setShowDropdown(true);
                  }}
                  placeholder="Search by address or owner name..."
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.property
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="animate-spin h-4 w-4 text-gray-400"
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
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && properties.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => handlePropertySelect(property)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-800 text-sm">
                        {property.address}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {property.owner_name}
                        {property.unit_number &&
                          ` · Unit ${property.unit_number}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown &&
                !searchLoading &&
                properties.length === 0 &&
                propertySearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                    No properties found for &quot;{propertySearch}&quot;
                  </div>
                )}
            </div>

            {errors.property && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.property}
              </p>
            )}

            {selectedProperty && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {selectedProperty.address}
                  </p>
                  <p className="text-xs text-blue-600">
                    {selectedProperty.owner_name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Violation Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Violation Details
            </h2>

            <div className="space-y-5">
              {/* Violation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Violation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={violationType}
                  onChange={(e) => {
                    setViolationType(e.target.value);
                    setErrors((prev) => ({ ...prev, violationType: "" }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white ${
                    errors.violationType
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select a violation type...</option>
                  {VIOLATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.violationType && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.violationType}
                  </p>
                )}
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => {
                        setSeverity(level.value);
                        setErrors((prev) => ({ ...prev, severity: "" }));
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        severity === level.value
                          ? `${level.color} border-current ring-2 ring-offset-1 ring-current`
                          : "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
                {errors.severity && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.severity}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors((prev) => ({ ...prev, description: "" }));
                  }}
                  rows={4}
                  placeholder="Describe the violation in detail..."
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${
                    errors.description
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description ? (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.description}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-gray-400">
                    {description.length} chars
                  </span>
                </div>
              </div>

              {/* Incident Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Date{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional context or notes..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Failed to submit violation
                </p>
                <p className="text-sm text-red-600 mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
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
    </div>
  );
}
