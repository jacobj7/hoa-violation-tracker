import { Suspense } from "react";
import { db } from "@/lib/db";
import ViolationsTable from "./ViolationsTable";

interface PageProps {
  searchParams: {
    page?: string;
    status?: string;
  };
}

async function getViolations(page: number, status?: string) {
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (status && status !== "all") {
    conditions.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM violations ${whereClause}`,
    values,
  );

  const total = parseInt(countResult.rows[0].total, 10);

  values.push(pageSize);
  values.push(offset);

  const result = await db.query(
    `SELECT
      v.id,
      v.title,
      v.description,
      v.status,
      v.severity,
      v.created_at,
      v.updated_at,
      u.name as reported_by_name,
      u.email as reported_by_email
    FROM violations v
    LEFT JOIN users u ON v.reported_by = u.id
    ${whereClause}
    ORDER BY v.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    values,
  );

  return {
    violations: result.rows,
    total,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export default async function ViolationsPage({ searchParams }: PageProps) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const status = searchParams.status;

  const { violations, total, pageSize, totalPages } = await getViolations(
    page,
    status,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} total violation{total !== 1 ? "s" : ""}
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <ViolationsTable
          violations={violations}
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          currentStatus={status || "all"}
        />
      </Suspense>
    </div>
  );
}
