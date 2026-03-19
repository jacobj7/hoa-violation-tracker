import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z
    .enum(["open", "in_progress", "resolved", "closed"])
    .optional()
    .default("open"),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
  reported_by: z.string().optional(),
  due_date: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const property_id = searchParams.get("property_id");

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      values.push(status);
    }

    if (property_id) {
      const parsedPropertyId = parseInt(property_id, 10);
      if (isNaN(parsedPropertyId)) {
        return NextResponse.json(
          { error: "Invalid property_id" },
          { status: 400 },
        );
      }
      conditions.push(`v.property_id = $${paramIndex++}`);
      values.push(parsedPropertyId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
      `SELECT 
        v.id,
        v.property_id,
        v.title,
        v.description,
        v.status,
        v.severity,
        v.reported_by,
        v.due_date,
        v.created_at,
        v.updated_at,
        p.address AS property_address,
        p.name AS property_name
      FROM violations v
      LEFT JOIN properties p ON p.id = v.property_id
      ${whereClause}
      ORDER BY v.created_at DESC`,
      values,
    );

    return NextResponse.json({ violations: result.rows }, { status: 200 });
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createViolationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const {
      property_id,
      title,
      description,
      status,
      severity,
      reported_by,
      due_date,
    } = parsed.data;

    // Verify property exists
    const propertyResult = await query(
      `SELECT id, name, address FROM properties WHERE id = $1`,
      [property_id],
    );

    if (propertyResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    const property = propertyResult.rows[0];

    const insertResult = await query(
      `INSERT INTO violations (property_id, title, description, status, severity, reported_by, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        property_id,
        title,
        description,
        status,
        severity,
        reported_by ?? session.user?.name ?? null,
        due_date ?? null,
      ],
    );

    const violation = insertResult.rows[0];

    // Send email notification
    try {
      const userEmail = session.user?.email;
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: `New Violation Created: ${title}`,
          html: `
            <h2>New Violation Report</h2>
            <p>A new violation has been created for property <strong>${property.name || property.address}</strong>.</p>
            <table style="border-collapse: collapse; width: 100%;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Title</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${description}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${status}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${severity}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Property</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${property.name || property.address}</td>
              </tr>
              ${due_date ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${due_date}</td></tr>` : ""}
            </table>
            <p>Violation ID: ${violation.id}</p>
            <p>Created at: ${new Date(violation.created_at).toLocaleString()}</p>
          `,
          text: `New Violation Created: ${title}\n\nProperty: ${property.name || property.address}\nDescription: ${description}\nStatus: ${status}\nSeverity: ${severity}${due_date ? `\nDue Date: ${due_date}` : ""}\n\nViolation ID: ${violation.id}`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send violation notification email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ violation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
