import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewViolationClient from "./NewViolationClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getProperties(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, address, unit_number, owner_name 
       FROM properties 
       WHERE user_id = $1 OR id IN (
         SELECT property_id FROM property_managers WHERE user_id = $1
       )
       ORDER BY address ASC`,
      [userId],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getCategories() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name, description, severity_default 
       FROM violation_categories 
       ORDER BY name ASC`,
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [properties, categories] = await Promise.all([
    getProperties(session.user.id),
    getCategories(),
  ]);

  return (
    <NewViolationClient
      properties={properties}
      categories={categories}
      userId={session.user.id}
    />
  );
}
