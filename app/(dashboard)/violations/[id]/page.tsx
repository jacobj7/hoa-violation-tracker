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
      v.severity,
      v.status,
      v.location,
      v.evidence_url,
      v.created_at,
      v.updated_at,
      v.user_id,
      u.name as reporter_name,
      u.email as reporter_email
    FROM violations v
    LEFT JOIN users u ON v.user_id = u.id
    WHERE v.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  const violation = await getViolation(params.id, session.user.id as string);

  if (!violation) {
    notFound();
  }

  const serializedViolation = {
    id: violation.id,
    title: violation.title,
    description: violation.description,
    severity: violation.severity,
    status: violation.status,
    location: violation.location ?? null,
    evidenceUrl: violation.evidence_url ?? null,
    createdAt: violation.created_at ? violation.created_at.toISOString() : null,
    updatedAt: violation.updated_at ? violation.updated_at.toISOString() : null,
    userId: violation.user_id,
    reporterName: violation.reporter_name ?? null,
    reporterEmail: violation.reporter_email ?? null,
  };

  return <ViolationDetailClient violation={serializedViolation} />;
}
