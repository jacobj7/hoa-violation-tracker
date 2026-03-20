import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetail from "./ViolationDetail";

interface PageProps {
  params: { id: string };
}

async function getViolation(id: string, userId: string) {
  const client = await db.connect();
  try {
    const result = await client.query(
      `SELECT 
        v.id,
        v.title,
        v.description,
        v.status,
        v.severity,
        v.category,
        v.location,
        v.evidence_url,
        v.ai_analysis,
        v.resolution_notes,
        v.created_at,
        v.updated_at,
        v.reported_by,
        v.assigned_to,
        u1.name AS reporter_name,
        u1.email AS reporter_email,
        u2.name AS assignee_name,
        u2.email AS assignee_email
      FROM violations v
      LEFT JOIN users u1 ON v.reported_by = u1.id
      LEFT JOIN users u2 ON v.assigned_to = u2.id
      WHERE v.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const violation = result.rows[0];

    // Check if user has access to this violation
    const userResult = await client.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const userRole = userResult.rows[0].role;

    // Allow access if admin, or if user reported or is assigned to the violation
    if (
      userRole !== "admin" &&
      violation.reported_by !== userId &&
      violation.assigned_to !== userId
    ) {
      return null;
    }

    // Fetch comments
    const commentsResult = await client.query(
      `SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        u.name AS author_name,
        u.email AS author_email
      FROM violation_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.violation_id = $1
      ORDER BY c.created_at ASC`,
      [id],
    );

    // Fetch attachments
    const attachmentsResult = await client.query(
      `SELECT 
        id,
        file_name,
        file_url,
        file_type,
        file_size,
        created_at
      FROM violation_attachments
      WHERE violation_id = $1
      ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...violation,
      id: violation.id.toString(),
      reported_by: violation.reported_by?.toString() ?? null,
      assigned_to: violation.assigned_to?.toString() ?? null,
      created_at: violation.created_at?.toISOString() ?? null,
      updated_at: violation.updated_at?.toISOString() ?? null,
      comments: commentsResult.rows.map((c: any) => ({
        ...c,
        id: c.id.toString(),
        user_id: c.user_id?.toString() ?? null,
        created_at: c.created_at?.toISOString() ?? null,
      })),
      attachments: attachmentsResult.rows.map((a: any) => ({
        ...a,
        id: a.id.toString(),
        created_at: a.created_at?.toISOString() ?? null,
      })),
    };
  } finally {
    client.release();
  }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <ViolationDetail
        violation={violation}
        currentUserId={session.user.id}
        currentUserRole={session.user.role ?? "user"}
      />
    </div>
  );
}
