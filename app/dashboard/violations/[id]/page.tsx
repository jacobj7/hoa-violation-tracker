import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

interface PageProps {
  params: { id: string };
}

async function getViolation(id: string, userId: string) {
  const result = await db.query(
    `SELECT 
      v.id,
      v.title,
      v.description,
      v.status,
      v.severity,
      v.category,
      v.location,
      v.reported_by,
      v.assigned_to,
      v.created_at,
      v.updated_at,
      v.resolved_at,
      v.resolution_notes,
      reporter.name AS reporter_name,
      reporter.email AS reporter_email,
      assignee.name AS assignee_name,
      assignee.email AS assignee_email
    FROM violations v
    LEFT JOIN users reporter ON v.reported_by = reporter.id
    LEFT JOIN users assignee ON v.assigned_to = assignee.id
    WHERE v.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getFines(violationId: string) {
  const result = await db.query(
    `SELECT 
      f.id,
      f.amount,
      f.currency,
      f.status,
      f.due_date,
      f.paid_at,
      f.payment_method,
      f.notes,
      f.created_at,
      f.updated_at,
      u.name AS issued_to_name,
      u.email AS issued_to_email
    FROM fines f
    LEFT JOIN users u ON f.issued_to = u.id
    WHERE f.violation_id = $1
    ORDER BY f.created_at DESC`,
    [violationId],
  );

  return result.rows;
}

async function getAuditLog(violationId: string) {
  const result = await db.query(
    `SELECT 
      al.id,
      al.action,
      al.field_changed,
      al.old_value,
      al.new_value,
      al.notes,
      al.created_at,
      u.name AS performed_by_name,
      u.email AS performed_by_email
    FROM audit_logs al
    LEFT JOIN users u ON al.performed_by = u.id
    WHERE al.entity_type = 'violation' AND al.entity_id = $1
    ORDER BY al.created_at DESC`,
    [violationId],
  );

  return result.rows;
}

function serializeData<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }),
  );
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const { id } = params;

  if (!id || isNaN(Number(id))) {
    notFound();
  }

  const [violation, fines, auditLog] = await Promise.all([
    getViolation(id, session.user.id),
    getFines(id),
    getAuditLog(id),
  ]);

  if (!violation) {
    notFound();
  }

  const serializedViolation = serializeData(violation);
  const serializedFines = serializeData(fines);
  const serializedAuditLog = serializeData(auditLog);

  return (
    <ViolationDetailClient
      violation={serializedViolation}
      fines={serializedFines}
      auditLog={serializedAuditLog}
      currentUserId={session.user.id}
    />
  );
}
