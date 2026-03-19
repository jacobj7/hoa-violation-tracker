import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, name, description, severity_level
         FROM violation_categories
         ORDER BY name ASC`,
      );
      return NextResponse.json({ categories: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violation categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch violation categories" },
      { status: 500 },
    );
  }
}
