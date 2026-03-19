import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { z } from "zod";
import { sendViolationEmail } from "@/lib/email";

const violationSchema = z.object({
  property_id: z.number(),
  violation_type_id: z.number(),
  description: z.string().min(1),
  due_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("property_id");

    let query = `
      SELECT v.*, p.address, vt.name as violation_type_name, u.name as owner_name, u.email as owner_email
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      JOIN violation_types vt ON v.violation_type_id = vt.id
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND v.status = $${paramCount++}`;
      params.push(status);
    }

    if (propertyId) {
      query += ` AND v.property_id = $${paramCount++}`;
      params.push(propertyId);
    }

    query += " ORDER BY v.created_at DESC";

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = violationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { property_id, violation_type_id, description, due_date } =
      parsed.data;

    const result = await pool.query(
      `INSERT INTO violations (property_id, violation_type_id, description, due_date, status, created_by)
       VALUES ($1, $2, $3, $4, 'open', $5)
       RETURNING *`,
      [
        property_id,
        violation_type_id,
        description,
        due_date || null,
        (session.user as any).id,
      ],
    );

    const violation = result.rows[0];

    // Get property and owner info for email
    try {
      const propResult = await pool.query(
        `SELECT p.address, u.email as owner_email
         FROM properties p
         LEFT JOIN users u ON p.owner_id = u.id
         WHERE p.id = $1`,
        [property_id],
      );

      if (propResult.rows[0]?.owner_email) {
        await sendViolationEmail({
          to: propResult.rows[0].owner_email,
          violationId: violation.id,
          address: propResult.rows[0].address,
          description,
          status: "open",
        });
      }
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return NextResponse.json(violation, { status: 201 });
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
