import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

async function getViolation(id: string) {
  const result = await db.query(
    `SELECT 
      v.id,
      v.title,
      v.description,
      v.status,
      v.severity,
      v.created_at,
      v.updated_at,
      v.assigned_to,
      v.reported_by,
      v.location,
      v.category,
      u1.name AS assigned_to_name,
      u1.email AS assigned_to_email,
      u2.name AS reported_by_name,
      u2.email AS reported_by_email
    FROM violations v
    LEFT JOIN users u1 ON v.assigned_to = u1.id
    LEFT JOIN users u2 ON v.reported_by = u2.id
    WHERE v.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getAuditLog(violationId: string) {
  const result = await db.query(
    `SELECT 
      al.id,
      al.action,
      al.field_changed,
      al.old_value,
      al.new_value,
      al.created_at,
      al.user_id,
      u.name AS user_name,
      u.email AS user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = 'violation' AND al.entity_id = $1
    ORDER BY al.created_at DESC`,
    [violationId],
  );

  return result.rows;
}

async function getAssignableUsers() {
  const result = await db.query(
    `SELECT id, name, email, role FROM users WHERE role IN ('manager', 'inspector', 'admin') ORDER BY name ASC`,
  );
  return result.rows;
}

export default async function ViolationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">
          You must be signed in to view this page.
        </p>
      </div>
    );
  }

  const [violation, auditLog, assignableUsers] = await Promise.all([
    getViolation(params.id),
    getAuditLog(params.id),
    getAssignableUsers(),
  ]);

  if (!violation) {
    notFound();
  }

  return (
    <ViolationDetailClient
      violation={violation}
      auditLog={auditLog}
      assignableUsers={assignableUsers}
      currentUser={session.user}
    />
  );
}
