import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const violationSchema = z.object({
  property_id: z.number(),
  violation_type_id: z.number(),
  description: z.string().min(1),
  occurred_at: z.string().optional(),
  fine_amount: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("property_id");
    const status = searchParams.get("status");

    let query = `
      SELECT v.*, p.address, p.owner_name, p.owner_email, vt.name as violation_type_name
      FROM violations v
      JOIN properties p ON v.property_id = p.id
      JOIN violation_types vt ON v.violation_type_id = vt.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (propertyId) {
      query += ` AND v.property_id = $${paramIndex++}`;
      params.push(propertyId);
    }

    if (status) {
      query += ` AND v.status = $${paramIndex++}`;
      params.push(status);
    }

    query += " ORDER BY v.created_at DESC";

    const result = await db.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = violationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const {
      property_id,
      violation_type_id,
      description,
      occurred_at,
      fine_amount,
    } = parsed.data;

    const result = await db.query(
      `INSERT INTO violations (property_id, violation_type_id, description, occurred_at, fine_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
       RETURNING *`,
      [
        property_id,
        violation_type_id,
        description,
        occurred_at || new Date().toISOString(),
        fine_amount || 0,
      ],
    );

    const violation = result.rows[0];

    // Send email notification if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const propertyResult = await db.query(
          "SELECT * FROM properties WHERE id = $1",
          [property_id],
        );
        const property = propertyResult.rows[0];

        if (property?.owner_email) {
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: property.owner_email,
            subject: "HOA Violation Notice",
            html: `<p>Dear ${property.owner_name},</p><p>A violation has been recorded for your property at ${property.address}.</p><p>Description: ${description}</p>`,
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return NextResponse.json(violation, { status: 201 });
  } catch (error) {
    console.error("Error creating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
