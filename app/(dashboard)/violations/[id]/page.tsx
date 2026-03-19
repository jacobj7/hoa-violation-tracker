import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import ViolationDetail from "./ViolationDetail";

interface ViolationRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  location: string | null;
  evidence_url: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
}

interface PageProps {
  params: { id: string };
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const { id } = params;

  let violation: ViolationRow | null = null;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query<ViolationRow>(
        `SELECT
          v.id,
          v.title,
          v.description,
          v.severity,
          v.status,
          v.created_at,
          v.updated_at,
          v.user_id,
          v.location,
          v.evidence_url,
          v.assigned_to,
          v.resolution_notes,
          u.name AS reporter_name,
          u.email AS reporter_email
        FROM violations v
        LEFT JOIN users u ON v.user_id = u.id
        WHERE v.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        notFound();
      }

      violation = result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation:", error);
    notFound();
  }

  if (!violation) {
    notFound();
  }

  const serializedViolation = {
    id: violation.id,
    title: violation.title,
    description: violation.description,
    severity: violation.severity,
    status: violation.status,
    createdAt: violation.created_at.toISOString(),
    updatedAt: violation.updated_at.toISOString(),
    userId: violation.user_id,
    location: violation.location,
    evidenceUrl: violation.evidence_url,
    assignedTo: violation.assigned_to,
    resolutionNotes: violation.resolution_notes,
    reporterName: violation.reporter_name,
    reporterEmail: violation.reporter_email,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ViolationDetail
        violation={serializedViolation}
        currentUserId={session.user?.id as string}
      />
    </div>
  );
}
