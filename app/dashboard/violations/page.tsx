import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import ViolationsClient from "./ViolationsClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Violation {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  location: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  reporter_name: string | null;
  assignee_name: string | null;
}

async function getViolations(userId: string): Promise<Violation[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        v.id,
        v.title,
        v.description,
        v.severity,
        v.status,
        v.location,
        v.reported_by,
        v.assigned_to,
        v.created_at,
        v.updated_at,
        reporter.name AS reporter_name,
        assignee.name AS assignee_name
      FROM violations v
      LEFT JOIN users reporter ON v.reported_by = reporter.id
      LEFT JOIN users assignee ON v.assigned_to = assignee.id
      ORDER BY v.created_at DESC`,
      [],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      severity: String(row.severity),
      status: String(row.status),
      location: row.location ? String(row.location) : null,
      reported_by: row.reported_by ? String(row.reported_by) : null,
      assigned_to: row.assigned_to ? String(row.assigned_to) : null,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
      reporter_name: row.reporter_name ? String(row.reporter_name) : null,
      assignee_name: row.assignee_name ? String(row.assignee_name) : null,
    }));
  } finally {
    client.release();
  }
}

export default async function ViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const violations = await getViolations(session.user.id as string);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Violations</h1>
        <p className="mt-2 text-gray-600">
          Manage and track all reported violations
        </p>
      </div>
      <ViolationsClient violations={violations} />
    </div>
  );
}
