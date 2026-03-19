import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";
import sgMail from "@sendgrid/mail";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

const noticeSchema = z.object({
  notice_type: z.string().min(1, "Notice type is required"),
  message: z.string().min(1, "Message is required"),
  sent_by: z.string().optional(),
});

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const violationId = context.params.id;

    if (!violationId || isNaN(Number(violationId))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = noticeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { notice_type, message, sent_by } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        `SELECT v.*, 
                u.email AS owner_email, 
                u.name AS owner_name,
                p.address AS property_address
         FROM violations v
         LEFT JOIN properties p ON v.property_id = p.id
         LEFT JOIN users u ON p.owner_id = u.id
         WHERE v.id = $1`,
        [violationId],
      );

      if (violationResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violation = violationResult.rows[0];

      const insertResult = await client.query(
        `INSERT INTO notices (violation_id, notice_type, message, sent_by, sent_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          violationId,
          notice_type,
          message,
          sent_by || session.user.email || session.user.name,
        ],
      );

      const notice = insertResult.rows[0];

      await client.query("COMMIT");

      if (violation.owner_email) {
        try {
          const emailMsg = {
            to: violation.owner_email,
            from: process.env.SENDGRID_FROM_EMAIL || "noreply@example.com",
            subject: `Notice: ${notice_type} - Violation #${violationId}`,
            text: `Dear ${violation.owner_name || "Property Owner"},\n\n${message}\n\nProperty Address: ${violation.property_address || "N/A"}\nViolation ID: ${violationId}\nNotice Type: ${notice_type}\n\nPlease contact us if you have any questions.\n\nThank you.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Notice: ${notice_type}</h2>
                <p>Dear ${violation.owner_name || "Property Owner"},</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;">${message}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Property Address:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${violation.property_address || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Violation ID:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${violationId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Notice Type:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${notice_type}</td>
                  </tr>
                </table>
                <p>Please contact us if you have any questions.</p>
                <p>Thank you.</p>
              </div>
            `,
          };

          await sgMail.send(emailMsg);
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      return NextResponse.json(
        {
          success: true,
          notice,
          message: "Notice created successfully",
          email_sent: !!violation.owner_email,
        },
        { status: 201 },
      );
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating notice:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
