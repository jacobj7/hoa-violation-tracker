import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, name, email FROM users WHERE role = 'inspector' ORDER BY name ASC`,
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching inspectors:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspectors" },
      { status: 500 },
    );
  }
}
