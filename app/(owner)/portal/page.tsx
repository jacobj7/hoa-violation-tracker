import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import OwnerPortalClient from "./OwnerPortalClient";

async function getOwnerViolations(ownerEmail: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        v.id,
        v.violation_type,
        v.description,
        v.status,
        v.issued_at,
        v.fine_amount,
        v.property_address,
        v.unit_number,
        a.id as appeal_id,
        a.reason as appeal_reason,
        a.status as appeal_status,
        a.submitted_at as appeal_submitted_at,
        a.response as appeal_response
      FROM violations v
      LEFT JOIN appeals a ON a.violation_id = v.id
      WHERE v.owner_email = $1
      ORDER BY v.issued_at DESC`,
      [ownerEmail],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getOwnerProfile(ownerEmail: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name, email, phone, created_at
       FROM owners
       WHERE email = $1`,
      [ownerEmail],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export default async function OwnerPortalPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const [violations, ownerProfile] = await Promise.all([
    getOwnerViolations(session.user.email),
    getOwnerProfile(session.user.email),
  ]);

  return (
    <OwnerPortalClient
      violations={violations}
      ownerProfile={ownerProfile}
      userEmail={session.user.email}
      userName={session.user.name || ""}
    />
  );
}
