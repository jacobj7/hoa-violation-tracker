import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewViolationClient from "./NewViolationClient";

async function getProperties() {
  const result = await db.query(
    `SELECT id, address, unit_number, owner_name 
     FROM properties 
     WHERE is_active = true 
     ORDER BY address ASC`,
  );
  return result.rows;
}

async function getViolationTypes() {
  const result = await db.query(
    `SELECT id, name, description, default_fine_amount 
     FROM violation_types 
     WHERE is_active = true 
     ORDER BY name ASC`,
  );
  return result.rows;
}

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const [properties, violationTypes] = await Promise.all([
    getProperties(),
    getViolationTypes(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Violation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record a new property violation with details and supporting photos.
        </p>
      </div>
      <NewViolationClient
        properties={properties}
        violationTypes={violationTypes}
        userId={session.user.id as string}
      />
    </div>
  );
}
