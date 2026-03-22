"use client";

import { useState } from "react";

interface Property {
  id: string;
  address: string;
  owner: string;
  unitCount: number;
  violationCount: number;
}

interface PageClientProps {
  properties?: Property[];
}

export default function PageClient({ properties }: PageClientProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Property>("address");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Property) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filtered = properties
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.address.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Property }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400 inline-block">↕</span>;
    }
    return (
      <span className="ml-1 text-blue-600 inline-block">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by address or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-md border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("address")}
              >
                Address
                <SortIcon field="address" />
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("owner")}
              >
                Owner
                <SortIcon field="owner" />
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("unitCount")}
              >
                Units
                <SortIcon field="unitCount" />
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("violationCount")}
              >
                Violations
                <SortIcon field="violationCount" />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {search
                    ? "No properties match your search."
                    : "No properties found."}
                </td>
              </tr>
            ) : (
              filtered.map((property) => (
                <tr
                  key={property.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {property.address}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {property.owner}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {property.unitCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        property.violationCount === 0
                          ? "bg-green-50 text-green-700"
                          : property.violationCount <= 2
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {property.violationCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <a
                      href={`/properties/${property.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {filtered.length} of {properties.length} propert
        {properties.length === 1 ? "y" : "ies"} shown
      </div>
    </div>
  );
}
