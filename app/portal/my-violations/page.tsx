import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import MyViolationsClient from "./MyViolationsClient";

interface Violation {
  id: number;
  violation_date: string;
  description: string;
  status: string;
  unit_number: string;
  property_address: string;
  created_at: string;
}

interface Fine {
  id: number;
  violation_id: number;
  amount: string;
  due_date: string;
  paid_date: string | null;
  status: string;
  created_at: string;
}

interface ViolationWithFines extends Violation {
  fines: Fine[];
}

export default async function MyViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/auth/signin");
  }

  const client = await pool.connect();

  let violationsWithFines: ViolationWithFines[] = [];

  try {
    const ownerResult = await client.query(
      `SELECT o.id FROM owners o
       INNER JOIN users u ON u.id = o.user_id
       WHERE u.email = $1`,
      [session.user.email],
    );

    if (ownerResult.rows.length === 0) {
      return (
        <MyViolationsClient violations={[]} ownerEmail={session.user.email} />
      );
    }

    const ownerId = ownerResult.rows[0].id;

    const violationsResult = await client.query<Violation>(
      `SELECT
         v.id,
         v.violation_date::text,
         v.description,
         v.status,
         u.unit_number,
         p.address AS property_address,
         v.created_at::text
       FROM violations v
       INNER JOIN units u ON u.id = v.unit_id
       INNER JOIN properties p ON p.id = u.property_id
       INNER JOIN unit_owners uo ON uo.unit_id = u.id AND uo.owner_id = $1
       ORDER BY v.violation_date DESC`,
      [ownerId],
    );

    const violations = violationsResult.rows;

    if (violations.length > 0) {
      const violationIds = violations.map((v) => v.id);

      const finesResult = await client.query<Fine>(
        `SELECT
           f.id,
           f.violation_id,
           f.amount::text,
           f.due_date::text,
           f.paid_date::text,
           f.status,
           f.created_at::text
         FROM fines f
         WHERE f.violation_id = ANY($1::int[])
         ORDER BY f.due_date ASC`,
        [violationIds],
      );

      const finesByViolationId: Record<number, Fine[]> = {};
      for (const fine of finesResult.rows) {
        if (!finesByViolationId[fine.violation_id]) {
          finesByViolationId[fine.violation_id] = [];
        }
        finesByViolationId[fine.violation_id].push(fine);
      }

      violationsWithFines = violations.map((v) => ({
        ...v,
        fines: finesByViolationId[v.id] || [],
      }));
    }
  } finally {
    client.release();
  }

  return (
    <MyViolationsClient
      violations={violationsWithFines}
      ownerEmail={session.user.email}
    />
  );
}
