import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import ViolationStatusBadge from "@/components/ViolationStatusBadge";

export default async function ViolationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let violations: Record<string, unknown>[] = [];
  try {
    const role = session.user.role;
    let result;
    if (role === "board") {
      result = await db.query(
        `SELECT v.*, p.address, u.name as owner_name
         FROM violations v
         LEFT JOIN properties p ON v.property_id = p.id
         LEFT JOIN users u ON p.owner_id = u.id
         ORDER BY v.created_at DESC`,
      );
    } else if (role === "inspector") {
      result = await db.query(
        `SELECT v.*, p.address, u.name as owner_name
         FROM violations v
         LEFT JOIN properties p ON v.property_id = p.id
         LEFT JOIN users u ON p.owner_id = u.id
         WHERE v.inspector_id = $1
         ORDER BY v.created_at DESC`,
        [session.user.id],
      );
    } else {
      result = await db.query(
        `SELECT v.*, p.address
         FROM violations v
         LEFT JOIN properties p ON v.property_id = p.id
         WHERE p.owner_id = $1
         ORDER BY v.created_at DESC`,
        [session.user.id],
      );
    }
    violations = result.rows;
  } catch (e) {
    console.error("Error fetching violations:", e);
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Violations</h1>
        {session.user.role === "inspector" && (
          <Link
            href="/dashboard/violations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            New Violation
          </Link>
        )}
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {violations.map((v) => (
              <tr key={String(v.id)}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {String(v.address || "")}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {String(v.description || "").substring(0, 50)}
                </td>
                <td className="px-6 py-4">
                  <ViolationStatusBadge status={String(v.status || "")} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {v.created_at
                    ? new Date(String(v.created_at)).toLocaleDateString()
                    : ""}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Link
                    href={`/dashboard/violations/${v.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {violations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No violations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
