import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

interface PageProps {
  params: {
    id: string;
  };
}

async function getViolation(id: string, userId: string) {
  const result = await db.query(
    `SELECT 
      v.id,
      v.title,
      v.description,
      v.severity,
      v.status,
      v.location,
      v.detected_at,
      v.resolved_at,
      v.created_at,
      v.updated_at,
      v.user_id,
      v.metadata,
      u.name as reporter_name,
      u.email as reporter_email
    FROM violations v
    LEFT JOIN users u ON v.user_id = u.id
    WHERE v.id = $1 AND v.user_id = $2`,
    [id, userId],
  );

  return result.rows[0] || null;
}

async function getViolationComments(violationId: string) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.content,
      c.created_at,
      c.updated_at,
      u.name as author_name,
      u.email as author_email
    FROM violation_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.violation_id = $1
    ORDER BY c.created_at ASC`,
    [violationId],
  );

  return result.rows;
}

async function getViolationHistory(violationId: string) {
  const result = await db.query(
    `SELECT 
      h.id,
      h.action,
      h.old_value,
      h.new_value,
      h.created_at,
      u.name as actor_name,
      u.email as actor_email
    FROM violation_history h
    LEFT JOIN users u ON h.user_id = u.id
    WHERE h.violation_id = $1
    ORDER BY h.created_at DESC`,
    [violationId],
  );

  return result.rows;
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const violation = await getViolation(params.id, session.user.id);

  if (!violation) {
    notFound();
  }

  const [comments, history] = await Promise.all([
    getViolationComments(params.id),
    getViolationHistory(params.id),
  ]);

  return (
    <ViolationDetailClient
      violation={violation}
      comments={comments}
      history={history}
      currentUserId={session.user.id}
    />
  );
}
