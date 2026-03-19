import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { getResend } from "@/lib/resend";
import { z } from "zod";

const noticeSchema = z.object({
  violationId: z.number(),
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  subject: z.string().optional(),
  message: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = noticeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { violationId, recipientEmail, recipientName, subject, message } =
      parsed.data;

    // Get violation details
    const client = await pool.connect();
    try {
      const violationResult = await client.query(
        `SELECT v.*, p.address, vc.name as category_name
         FROM violations v
         LEFT JOIN properties p ON v.property_id = p.id
         LEFT JOIN violation_categories vc ON v.category_id = vc.id
         WHERE v.id = $1`,
        [violationId],
      );

      if (violationResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const violation = violationResult.rows[0];

      // Send email via Resend
      const resend = getResend();
      const emailSubject =
        subject ||
        `HOA Violation Notice - ${violation.category_name || "Violation"}`;

      let emailSent = false;
      let emailError = null;

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
          to: recipientEmail,
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>HOA Violation Notice</h2>
              <p>Dear ${recipientName},</p>
              <p>${message}</p>
              <hr />
              <h3>Violation Details</h3>
              <p><strong>Property:</strong> ${violation.address || "N/A"}</p>
              <p><strong>Category:</strong> ${violation.category_name || "N/A"}</p>
              <p><strong>Description:</strong> ${violation.description || "N/A"}</p>
              <p><strong>Status:</strong> ${violation.status || "N/A"}</p>
              <p><strong>Date Reported:</strong> ${violation.created_at ? new Date(violation.created_at).toLocaleDateString() : "N/A"}</p>
              <hr />
              <p>If you have any questions, please contact your HOA management office.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err: unknown) {
        emailError =
          err instanceof Error ? err.message : "Failed to send email";
        console.error("Email send error:", err);
      }

      // Log the notice in the database
      await client
        .query(
          `INSERT INTO notices (violation_id, recipient_email, recipient_name, subject, message, sent_at, status)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT DO NOTHING`,
          [
            violationId,
            recipientEmail,
            recipientName,
            emailSubject,
            message,
            emailSent ? "sent" : "failed",
          ],
        )
        .catch(() => {
          // notices table may not exist, ignore
        });

      if (!emailSent) {
        return NextResponse.json(
          { error: "Failed to send notice email", details: emailError },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notice sent successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Notice API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const violationId = searchParams.get("violationId");

    const client = await pool.connect();
    try {
      let query = "SELECT * FROM notices ORDER BY sent_at DESC";
      const params: unknown[] = [];

      if (violationId) {
        query =
          "SELECT * FROM notices WHERE violation_id = $1 ORDER BY sent_at DESC";
        params.push(parseInt(violationId));
      }

      const result = await client.query(query, params);
      return NextResponse.json({ notices: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Notice GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
