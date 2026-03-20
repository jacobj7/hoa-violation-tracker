"use client";

import { useSession } from "next-auth/react";

export default function DashboardClient() {
  const { data: session } = useSession();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
      {session?.user && (
        <p className="text-gray-600">
          Welcome, {session.user.name || session.user.email}
        </p>
      )}
    </div>
  );
}
