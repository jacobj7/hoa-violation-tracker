import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

interface PageProps {
  params: { id: string };
}

async function getViolationDetail(id: string) {
  const violationResult = await db.query(
    `SELECT 
      v.id,
      v.case_number,
      v.status,
      v.description,
      v.location,
      v.violation_date,
      v.created_at,
      v.updated_at,
      vt.name AS violation_type,
      vt.code AS violation_code,
      u.id AS officer_id,
      u.name AS officer_name,
      u.email AS officer_email,
      s.id AS subject_id,
      s.name AS subject_name,
      s.email AS subject_email,
      s.phone AS subject_phone,
      s.address AS subject_address
    FROM violations v
    LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
    LEFT JOIN users u ON v.officer_id = u.id
    LEFT JOIN subjects s ON v.subject_id = s.id
    WHERE v.id = $1`,
    [id],
  );

  if (violationResult.rows.length === 0) {
    return null;
  }

  const violation = violationResult.rows[0];

  const finesResult = await db.query(
    `SELECT 
      f.id,
      f.amount,
      f.status,
      f.due_date,
      f.paid_date,
      f.payment_method,
      f.notes,
      f.created_at
    FROM fines f
    WHERE f.violation_id = $1
    ORDER BY f.created_at DESC`,
    [id],
  );

  const hearingsResult = await db.query(
    `SELECT 
      h.id,
      h.scheduled_date,
      h.location,
      h.status,
      h.outcome,
      h.notes,
      h.created_at,
      u.name AS judge_name
    FROM hearings h
    LEFT JOIN users u ON h.judge_id = u.id
    WHERE h.violation_id = $1
    ORDER BY h.scheduled_date ASC`,
    [id],
  );

  const evidenceResult = await db.query(
    `SELECT 
      e.id,
      e.file_name,
      e.file_type,
      e.file_url,
      e.description,
      e.uploaded_at,
      u.name AS uploaded_by_name
    FROM evidence e
    LEFT JOIN users u ON e.uploaded_by = u.id
    WHERE e.violation_id = $1
    ORDER BY e.uploaded_at DESC`,
    [id],
  );

  const appealsResult = await db.query(
    `SELECT 
      a.id,
      a.status,
      a.reason,
      a.outcome,
      a.submitted_at,
      a.resolved_at,
      a.notes,
      u.name AS reviewer_name
    FROM appeals a
    LEFT JOIN users u ON a.reviewer_id = u.id
    WHERE a.violation_id = $1
    ORDER BY a.submitted_at DESC`,
    [id],
  );

  return {
    violation,
    fines: finesResult.rows,
    hearings: hearingsResult.rows,
    evidence: evidenceResult.rows,
    appeals: appealsResult.rows,
  };
}

function serializeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      result[key] = serializeData(value);
    }
    return result;
  }
  return data;
}

export default async function ViolationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const { id } = params;

  if (!id || isNaN(Number(id))) {
    notFound();
  }

  const data = await getViolationDetail(id);

  if (!data) {
    notFound();
  }

  const serializedData = serializeData(data) as {
    violation: Record<string, string | number | null>;
    fines: Array<Record<string, string | number | null>>;
    hearings: Array<Record<string, string | number | null>>;
    evidence: Array<Record<string, string | number | null>>;
    appeals: Array<Record<string, string | number | null>>;
  };

  return (
    <ViolationDetailClient
      violation={serializedData.violation}
      fines={serializedData.fines}
      hearings={serializedData.hearings}
      evidence={serializedData.evidence}
      appeals={serializedData.appeals}
    />
  );
}
