import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ViolationStatusBadge from "@/components/ViolationStatusBadge";
import Link from "next/link";

export default async function ViolationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let violation: Record<string, unknown> | null = null;
  try {
    const result = await db.query(
      `SELECT v.*, p.address, u.name as owner_name, i.name as inspector_name
       FROM violations v
       LEFT JOIN properties p ON v.property_id = p.id
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN users i ON v.inspector_id = i.id
       WHERE v.id = $1`,
      [params.id],
    );
    violation = result.rows[0] || null;
  } catch (e) {
    console.error("Error fetching violation:", e);
  }

  if (!violation) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/violations" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Violations
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Violation Details</h1>
          <ViolationStatusBadge status={String(violation.status || "")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Property</p>
            <p className="font-medium">{String(violation.address || "")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Owner</p>
            <p className="font-medium">{String(violation.owner_name || "")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Inspector</p>
            <p className="font-medium">
              {String(violation.inspector_name || "")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">
              {violation.created_at
                ? new Date(String(violation.created_at)).toLocaleDateString()
                : ""}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Description</p>
            <p className="font-medium">{String(violation.description || "")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
