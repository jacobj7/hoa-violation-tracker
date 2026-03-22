import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewViolationClient from "./NewViolationClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const client = await pool.connect();

  try {
    const [propertiesResult, categoriesResult, inspectorsResult] =
      await Promise.all([
        client.query(
          `SELECT id, name, address FROM properties ORDER BY name ASC`,
        ),
        client.query(
          `SELECT id, name, description FROM violation_categories ORDER BY name ASC`,
        ),
        client.query(
          `SELECT id, name, email FROM users WHERE role = 'inspector' ORDER BY name ASC`,
        ),
      ]);

    const properties = propertiesResult.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      address: String(row.address),
    }));

    const categories = categoriesResult.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
    }));

    const inspectors = inspectorsResult.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
    }));

    return (
      <NewViolationClient
        properties={properties}
        categories={categories}
        inspectors={inspectors}
      />
    );
  } finally {
    client.release();
  }
}
