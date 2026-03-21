import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import PortalClient from "./PortalClient";

interface Violation {
  id: number;
  property_address: string;
  violation_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  notices: Notice[];
}

interface Notice {
  id: number;
  violation_id: number;
  sent_at: string;
  method: string;
  content: string;
  status: string;
}

async function getOwnerViolations(ownerEmail: string): Promise<Violation[]> {
  const client = await pool.connect();
  try {
    const violationsResult = await client.query(
      `
      SELECT 
        v.id,
        p.address AS property_address,
        v.violation_type,
        v.description,
        v.status,
        v.created_at,
        v.updated_at
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      JOIN owners o ON p.owner_id = o.id
      WHERE o.email = $1
      ORDER BY v.created_at DESC
      `,
      [ownerEmail],
    );

    const violations = violationsResult.rows;

    if (violations.length === 0) {
      return [];
    }

    const violationIds = violations.map((v: { id: number }) => v.id);

    const noticesResult = await client.query(
      `
      SELECT 
        n.id,
        n.violation_id,
        n.sent_at,
        n.method,
        n.content,
        n.status
      FROM notices n
      WHERE n.violation_id = ANY($1::int[])
      ORDER BY n.sent_at DESC
      `,
      [violationIds],
    );

    const noticesByViolationId: Record<number, Notice[]> = {};
    for (const notice of noticesResult.rows) {
      if (!noticesByViolationId[notice.violation_id]) {
        noticesByViolationId[notice.violation_id] = [];
      }
      noticesByViolationId[notice.violation_id].push(notice);
    }

    return violations.map((v: Omit<Violation, "notices">) => ({
      ...v,
      notices: noticesByViolationId[v.id] || [],
    }));
  } finally {
    client.release();
  }
}

export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const violations = await getOwnerViolations(session.user.email);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {session.user.name || session.user.email}. View and
            manage violations for your properties.
          </p>
        </div>
        <PortalClient violations={violations} userEmail={session.user.email} />
      </div>
    </main>
  );
}
