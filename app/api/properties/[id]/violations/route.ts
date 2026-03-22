import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid property ID" },
        { status: 400 },
      );
    }

    const { id: propertyId } = parsed.data;
    const userId = (session.user as { id?: string }).id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      const ownershipCheck = await client.query(
        `SELECT id FROM properties WHERE id = $1 AND owner_id = $2`,
        [propertyId, userId],
      );

      if (ownershipCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Property not found or access denied" },
          { status: 404 },
        );
      }

      const violationsResult = await client.query(
        `SELECT
          v.id,
          v.property_id,
          v.category,
          v.status,
          v.cure_deadline,
          v.description,
          v.created_at,
          v.updated_at
        FROM violations v
        WHERE v.property_id = $1
        ORDER BY v.created_at DESC`,
        [propertyId],
      );

      return NextResponse.json(
        {
          property_id: propertyId,
          violations: violationsResult.rows,
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
