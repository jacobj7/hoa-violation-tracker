import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewViolationClient from "./NewViolationClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getProperties() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, address, unit_number, owner_name
       FROM properties
       ORDER BY address ASC`,
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getViolationTypes() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name, description, default_fine_amount
       FROM violation_types
       ORDER BY name ASC`,
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [properties, violationTypes] = await Promise.all([
    getProperties(),
    getViolationTypes(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Violation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new violation record for a property.
        </p>
      </div>
      <NewViolationClient
        properties={properties}
        violationTypes={violationTypes}
      />
    </div>
  );
}
