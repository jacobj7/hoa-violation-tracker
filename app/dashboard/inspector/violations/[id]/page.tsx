import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ViolationDetailClient from "./ViolationDetailClient";

export default async function InspectorViolationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "inspector") redirect("/dashboard");

  let violation: Record<string, unknown> | null = null;
  try {
    const result = await db.query(
      `SELECT v.*, p.address, u.name as owner_name
       FROM violations v
       LEFT JOIN properties p ON v.property_id = p.id
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE v.id = $1 AND v.inspector_id = $2`,
      [params.id, session.user.id],
    );
    violation = result.rows[0] || null;
  } catch (e) {
    console.error("Error fetching violation:", e);
  }

  if (!violation) notFound();

  return <ViolationDetailClient violation={violation} />;
}
