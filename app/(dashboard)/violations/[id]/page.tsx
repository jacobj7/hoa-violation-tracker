import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

interface PageProps {
  params: { id: string };
}

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
      v.resolved_at,
      v.resolution_notes,
      v.evidence_urls,
      v.location,
      v.incident_date,
      u_reporter.id AS reporter_id,
      u_reporter.name AS reporter_name,
      u_reporter.email AS reporter_email,
      u_assignee.id AS assignee_id,
      u_assignee.name AS assignee_name,
      u_assignee.email AS assignee_email,
      c.id AS category_id,
      c.name AS category_name,
      c.description AS category_description,
      s.id AS subject_id,
      s.name AS subject_name,
      s.email AS subject_email,
      s.department AS subject_department
    FROM violations v
    LEFT JOIN users u_reporter ON v.reporter_id = u_reporter.id
    LEFT JOIN users u_assignee ON v.assignee_id = u_assignee.id
    LEFT JOIN categories c ON v.category_id = c.id
    LEFT JOIN subjects s ON v.subject_id = s.id
    WHERE v.id = $1`,
    [id],
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows[0];

  const commentsResult = await db.query(
    `SELECT 
      cm.id,
      cm.content,
      cm.created_at,
      cm.updated_at,
      u.id AS author_id,
      u.name AS author_name,
      u.email AS author_email
    FROM comments cm
    LEFT JOIN users u ON cm.author_id = u.id
    WHERE cm.violation_id = $1
    ORDER BY cm.created_at ASC`,
    [id],
  );

  const auditResult = await db.query(
    `SELECT 
      al.id,
      al.action,
      al.field_changed,
      al.old_value,
      al.new_value,
      al.created_at,
      u.id AS actor_id,
      u.name AS actor_name,
      u.email AS actor_email
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_id = u.id
    WHERE al.violation_id = $1
    ORDER BY al.created_at DESC`,
    [id],
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    severity: row.severity,
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    resolutionNotes: row.resolution_notes,
    evidenceUrls: row.evidence_urls,
    location: row.location,
    incidentDate: row.incident_date?.toISOString() ?? null,
    reporter: row.reporter_id
      ? {
          id: row.reporter_id,
          name: row.reporter_name,
          email: row.reporter_email,
        }
      : null,
    assignee: row.assignee_id
      ? {
          id: row.assignee_id,
          name: row.assignee_name,
          email: row.assignee_email,
        }
      : null,
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
        }
      : null,
    subject: row.subject_id
      ? {
          id: row.subject_id,
          name: row.subject_name,
          email: row.subject_email,
          department: row.subject_department,
        }
      : null,
    comments: commentsResult.rows.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at?.toISOString() ?? null,
      updatedAt: c.updated_at?.toISOString() ?? null,
      author: c.author_id
        ? {
            id: c.author_id,
            name: c.author_name,
            email: c.author_email,
          }
        : null,
    })),
    auditLogs: auditResult.rows.map((a) => ({
      id: a.id,
      action: a.action,
      fieldChanged: a.field_changed,
      oldValue: a.old_value,
      newValue: a.new_value,
      createdAt: a.created_at?.toISOString() ?? null,
      actor: a.actor_id
        ? {
            id: a.actor_id,
            name: a.actor_name,
            email: a.actor_email,
          }
        : null,
    })),
  };
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const violation = await getViolation(params.id);

  if (!violation) {
    notFound();
  }

  const role = (session.user as { role?: string })?.role ?? "user";

  return (
    <ViolationDetailClient
      violation={violation}
      role={role}
      currentUserId={(session.user as { id?: string })?.id ?? ""}
    />
  );
}
