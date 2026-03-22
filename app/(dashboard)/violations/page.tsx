import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ViolationsClient from "./ViolationsClient";

interface ViolationRow {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string;
  reporter_name: string | null;
  assignee_name: string | null;
  location: string | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ViolationsPageProps {
  searchParams: {
    status?: string;
    page?: string;
  };
}

async function fetchViolations(
  status: string | undefined,
  page: number,
): Promise<{ violations: ViolationRow[]; pagination: PaginationInfo }> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (status && status !== "all") {
    conditions.push(`v.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) as total
    FROM violations v
    ${whereClause}
  `;

  const dataQuery = `
    SELECT
      v.id::text,
      v.title,
      v.description,
      v.status,
      v.severity,
      v.created_at::text,
      v.updated_at::text,
      v.location,
      reporter.name as reporter_name,
      assignee.name as assignee_name
    FROM violations v
    LEFT JOIN users reporter ON v.reporter_id = reporter.id
    LEFT JOIN users assignee ON v.assignee_id = assignee.id
    ${whereClause}
    ORDER BY v.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const countValues = [...values];
  const dataValues = [...values, pageSize, offset];

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countValues),
      pool.query(dataQuery, dataValues),
    ]);

    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);
    const totalPages = Math.ceil(total / pageSize);

    const violations: ViolationRow[] = dataResult.rows.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? "",
      status: row.status ?? "open",
      severity: row.severity ?? "low",
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      reporter_name: row.reporter_name ?? null,
      assignee_name: row.assignee_name ?? null,
      location: row.location ?? null,
    }));

    return {
      violations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  } finally {
    await pool.end();
  }
}

export default async function ViolationsPage({
  searchParams,
}: ViolationsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const status = searchParams.status;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  let violations: ViolationRow[] = [];
  let pagination: PaginationInfo = {
    page,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  };

  try {
    const result = await fetchViolations(status, page);
    violations = result.violations;
    pagination = result.pagination;
  } catch (error) {
    console.error("Failed to fetch violations:", error);
  }

  const serializedViolations = violations.map((v) => ({
    ...v,
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and track all violations in the system
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        }
      >
        <ViolationsClient
          violations={serializedViolations}
          pagination={pagination}
          currentStatus={status ?? "all"}
        />
      </Suspense>
    </div>
  );
}
