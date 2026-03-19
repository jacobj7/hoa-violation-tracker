import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import PortalClient from "./PortalClient";

interface Property {
  id: number;
  address: string;
  unit_number: string | null;
  property_type: string;
  status: string;
  created_at: string;
}

interface Violation {
  id: number;
  property_id: number;
  property_address: string;
  violation_type: string;
  description: string;
  status: string;
  fine_amount: number;
  issued_at: string;
  resolved_at: string | null;
}

interface FineBalance {
  property_id: number;
  property_address: string;
  total_fines: number;
  paid_fines: number;
  outstanding_balance: number;
}

interface PortalData {
  properties: Property[];
  violations: Violation[];
  fineBalances: FineBalance[];
  totalOutstanding: number;
  ownerName: string;
  ownerEmail: string;
}

async function getOwnerPortalData(userId: string): Promise<PortalData> {
  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT id, name, email FROM users WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = userResult.rows[0];

    const propertiesResult = await client.query(
      `SELECT 
        p.id,
        p.address,
        p.unit_number,
        p.property_type,
        p.status,
        p.created_at::text as created_at
      FROM properties p
      WHERE p.owner_id = $1
      ORDER BY p.address ASC`,
      [userId],
    );

    const properties: Property[] = propertiesResult.rows;

    const violationsResult = await client.query(
      `SELECT 
        v.id,
        v.property_id,
        p.address as property_address,
        v.violation_type,
        v.description,
        v.status,
        v.fine_amount,
        v.issued_at::text as issued_at,
        v.resolved_at::text as resolved_at
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      WHERE p.owner_id = $1
      ORDER BY v.issued_at DESC`,
      [userId],
    );

    const violations: Violation[] = violationsResult.rows;

    const fineBalancesResult = await client.query(
      `SELECT 
        p.id as property_id,
        p.address as property_address,
        COALESCE(SUM(v.fine_amount), 0) as total_fines,
        COALESCE(SUM(CASE WHEN v.status = 'paid' THEN v.fine_amount ELSE 0 END), 0) as paid_fines,
        COALESCE(SUM(CASE WHEN v.status != 'paid' AND v.status != 'dismissed' THEN v.fine_amount ELSE 0 END), 0) as outstanding_balance
      FROM properties p
      LEFT JOIN violations v ON v.property_id = p.id
      WHERE p.owner_id = $1
      GROUP BY p.id, p.address
      ORDER BY p.address ASC`,
      [userId],
    );

    const fineBalances: FineBalance[] = fineBalancesResult.rows.map((row) => ({
      property_id: row.property_id,
      property_address: row.property_address,
      total_fines: parseFloat(row.total_fines),
      paid_fines: parseFloat(row.paid_fines),
      outstanding_balance: parseFloat(row.outstanding_balance),
    }));

    const totalOutstanding = fineBalances.reduce(
      (sum, fb) => sum + fb.outstanding_balance,
      0,
    );

    return {
      properties,
      violations,
      fineBalances,
      totalOutstanding,
      ownerName: user.name || "Property Owner",
      ownerEmail: user.email,
    };
  } finally {
    client.release();
  }
}

export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string }).id;

  if (!userId) {
    redirect("/login");
  }

  let portalData: PortalData;

  try {
    portalData = await getOwnerPortalData(userId);
  } catch (error) {
    console.error("Failed to fetch portal data:", error);
    portalData = {
      properties: [],
      violations: [],
      fineBalances: [],
      totalOutstanding: 0,
      ownerName: session.user.name || "Property Owner",
      ownerEmail: session.user.email || "",
    };
  }

  const serializedData = JSON.parse(JSON.stringify(portalData));

  return <PortalClient data={serializedData} />;
}
