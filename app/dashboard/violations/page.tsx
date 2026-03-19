import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import ViolationsListClient from "./ViolationsListClient";

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
  reported_by: string;
  reporter_name: string | null;
  reporter_email: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  category: string | null;
  evidence_urls: string[] | null;
  notes: string | null;
}

async function getViolations(
  userId: string,
  userRole: string,
): Promise<Violation[]> {
  const client = await pool.connect();
  try {
    let query: string;
    let params: string[];

    if (userRole === "admin" || userRole === "supervisor") {
      query = `
        SELECT 
          v.id,
          v.title,
          v.description,
          v.severity,
          v.status,
          v.location,
          v.reported_by,
          reporter.name AS reporter_name,
          reporter.email AS reporter_email,
          v.assigned_to,
          assignee.name AS assignee_name,
          v.created_at,
          v.updated_at,
          v.resolved_at,
          v.category,
          v.evidence_urls,
          v.notes
        FROM violations v
        LEFT JOIN users reporter ON v.reported_by = reporter.id
        LEFT JOIN users assignee ON v.assigned_to = assignee.id
        ORDER BY v.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT 
          v.id,
          v.title,
          v.description,
          v.severity,
          v.status,
          v.location,
          v.reported_by,
          reporter.name AS reporter_name,
          reporter.email AS reporter_email,
          v.assigned_to,
          assignee.name AS assignee_name,
          v.created_at,
          v.updated_at,
          v.resolved_at,
          v.category,
          v.evidence_urls,
          v.notes
        FROM violations v
        LEFT JOIN users reporter ON v.reported_by = reporter.id
        LEFT JOIN users assignee ON v.assigned_to = assignee.id
        WHERE v.reported_by = $1 OR v.assigned_to = $1
        ORDER BY v.created_at DESC
      `;
      params = [userId];
    }

    const result = await client.query(query, params);

    return result.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      severity: String(row.severity),
      status: String(row.status),
      location: row.location ? String(row.location) : null,
      reported_by: String(row.reported_by),
      reporter_name: row.reporter_name ? String(row.reporter_name) : null,
      reporter_email: row.reporter_email ? String(row.reporter_email) : null,
      assigned_to: row.assigned_to ? String(row.assigned_to) : null,
      assignee_name: row.assignee_name ? String(row.assignee_name) : null,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
      resolved_at: row.resolved_at
        ? row.resolved_at instanceof Date
          ? row.resolved_at.toISOString()
          : String(row.resolved_at)
        : null,
      category: row.category ? String(row.category) : null,
      evidence_urls: Array.isArray(row.evidence_urls)
        ? row.evidence_urls.map(String)
        : null,
      notes: row.notes ? String(row.notes) : null,
    }));
  } finally {
    client.release();
  }
}

async function getViolationStats(userId: string, userRole: string) {
  const client = await pool.connect();
  try {
    let query: string;
    let params: string[];

    if (userRole === "admin" || userRole === "supervisor") {
      query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'open') AS open_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
          COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
          COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
          COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
          COUNT(*) FILTER (WHERE severity = 'low') AS low_count
        FROM violations
      `;
      params = [];
    } else {
      query = `
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'open') AS open_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
          COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
          COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
          COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
          COUNT(*) FILTER (WHERE severity = 'low') AS low_count
        FROM violations
        WHERE reported_by = $1 OR assigned_to = $1
      `;
      params = [userId];
    }

    const result = await client.query(query, params);
    const row = result.rows[0];

    return {
      total: parseInt(row.total, 10),
      open: parseInt(row.open_count, 10),
      inProgress: parseInt(row.in_progress_count, 10),
      resolved: parseInt(row.resolved_count, 10),
      critical: parseInt(row.critical_count, 10),
      high: parseInt(row.high_count, 10),
      medium: parseInt(row.medium_count, 10),
      low: parseInt(row.low_count, 10),
    };
  } finally {
    client.release();
  }
}

export default async function ViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string }).id ?? "";
  const userRole = (session.user as { role?: string }).role ?? "user";

  const [violations, stats] = await Promise.all([
    getViolations(userId, userRole),
    getViolationStats(userId, userRole),
  ]);

  return (
    <ViolationsListClient
      violations={violations}
      stats={stats}
      userRole={userRole}
      userId={userId}
    />
  );
}
