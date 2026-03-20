"use client";

import { useState, useEffect } from "react";

interface Fine {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  violation_id: string;
}

export default function FinesClient() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Fines</h1>
      {fines.length === 0 ? (
        <p>No fines found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Due Date</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id}>
                <td className="border p-2">{fine.id}</td>
                <td className="border p-2">${fine.amount}</td>
                <td className="border p-2">{formatDate(fine.due_date)}</td>
                <td className="border p-2">{fine.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
