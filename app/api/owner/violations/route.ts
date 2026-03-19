import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const result = await pool.query(
      `SELECT v.*, p.address, vt.name as violation_type_name
       FROM violations v
       JOIN properties p ON v.property_id = p.id
       JOIN violation_types vt ON v.violation_type_id = vt.id
       WHERE p.owner_id = $1
       ORDER BY v.created_at DESC`,
      [userId],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/owner/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
