import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const result = await query(
    `SELECT
      v.id,
      v.title,
      v.description,
      v.severity,
      v.status,
      v.created_at,
      v.updated_at,
      v.assigned_to,
      u.name AS assigned_to_name,
      v.reported_by,
      r.name AS reported_by_name
    FROM violations v
    LEFT JOIN users u ON u.id = v.assigned_to
    LEFT JOIN users r ON r.id = v.reported_by
    WHERE v.status = 'open'
    ORDER BY
      CASE v.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      v.created_at DESC`,
    [],
  );

  const violations = result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    severity: String(row.severity ?? ""),
    status: String(row.status ?? ""),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    assignedToName: row.assigned_to_name ? String(row.assigned_to_name) : null,
    reportedBy: row.reported_by ? String(row.reported_by) : null,
    reportedByName: row.reported_by_name ? String(row.reported_by_name) : null,
  }));

  const user = {
    id: String(session.user.id ?? ""),
    name: String(session.user.name ?? ""),
    email: String(session.user.email ?? ""),
    role: String((session.user as { role?: string }).role ?? "user"),
  };

  return <DashboardClient violations={violations} user={user} />;
}
