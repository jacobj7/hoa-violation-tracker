"use client";

import { useState, useEffect } from "react";

interface Category {
  id: number;
  name: string;
  description: string | null;
  severity_level: number;
  created_at: string;
}

interface ApiResponse {
  categories: Category[];
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severityLevel, setSeverityLevel] = useState(1);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/violation-categories");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch categories");
      }
      const data: ApiResponse = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/violation-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          severity_level: severityLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setFormSuccess("Category created successfully!");
      setName("");
      setDescription("");
      setSeverityLevel(1);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Violation Categories
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage categories used to classify violations.
        </p>
      </div>

      {/* Create Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Create New Category
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Speeding"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label
              htmlFor="severityLevel"
              className="block text-sm font-medium text-gray-700"
            >
              Severity Level <span className="text-red-500">*</span>
            </label>
            <select
              id="severityLevel"
              value={severityLevel}
              onChange={(e) => setSeverityLevel(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level} —{" "}
                  {level === 1
                    ? "Low"
                    : level === 2
                      ? "Minor"
                      : level === 3
                        ? "Moderate"
                        : level === 4
                          ? "High"
                          : "Critical"}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
              {formSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Category"}
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            All Categories
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading categories...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No categories found. Create one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {category.description || (
                        <span className="italic text-gray-400">
                          No description
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          category.severity_level <= 1
                            ? "bg-green-100 text-green-800"
                            : category.severity_level === 2
                              ? "bg-yellow-100 text-yellow-800"
                              : category.severity_level === 3
                                ? "bg-orange-100 text-orange-800"
                                : category.severity_level === 4
                                  ? "bg-red-100 text-red-800"
                                  : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        Level {category.severity_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
