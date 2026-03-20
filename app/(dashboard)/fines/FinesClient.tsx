"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface Fine {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  property_address: string;
  owner_name: string;
}

export default function FinesClient() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      const response = await fetch("/api/fines");
      if (response.ok) {
        const data = await response.json();
        setFines(data);
      }
    } catch (error) {
      console.error("Error fetching fines:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading fines...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Fines</h1>
      {fines.length === 0 ? (
        <p className="text-gray-500">No fines found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left border-b">Property</th>
                <th className="px-4 py-2 text-left border-b">Owner</th>
                <th className="px-4 py-2 text-left border-b">Amount</th>
                <th className="px-4 py-2 text-left border-b">Description</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
                <th className="px-4 py-2 text-left border-b">Date</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((fine) => (
                <tr key={fine.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    {fine.property_address}
                  </td>
                  <td className="px-4 py-2 border-b">{fine.owner_name}</td>
                  <td className="px-4 py-2 border-b">
                    ${fine.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 border-b">{fine.description}</td>
                  <td className="px-4 py-2 border-b">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        fine.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : fine.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {fine.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b">
                    {format(new Date(fine.created_at), "MMM dd, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
