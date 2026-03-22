import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PropertiesClient from "./PropertiesClient";

async function getProperties() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/properties`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching properties:", error);
    return { properties: [], total: 0 };
  }
}

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const data = await getProperties();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
        <p className="mt-2 text-gray-600">
          Manage and monitor all properties and their violation status.
        </p>
      </div>
      <PropertiesClient
        initialProperties={data.properties || []}
        total={data.total || 0}
      />
    </div>
  );
}
