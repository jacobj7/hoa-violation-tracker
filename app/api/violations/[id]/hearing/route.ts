import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const hearingSchema = z.object({
  scheduled_at: z.string().datetime(),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional().default(""),
});

async function generateHearingEmailContent(
  violationDetails: Record<string, unknown>,
  hearingDetails: { scheduled_at: string; location: string; notes: string },
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a professional hearing notification email for the following violation and hearing details:

Violation Details:
- Violation ID: ${violationDetails.id}
- Type: ${violationDetails.type || "N/A"}
- Description: ${violationDetails.description || "N/A"}
- Status: ${violationDetails.status || "N/A"}
- Reported Date: ${violationDetails.created_at || "N/A"}

Hearing Details:
- Scheduled At: ${hearingDetails.scheduled_at}
- Location: ${hearingDetails.location}
- Notes: ${hearingDetails.notes || "No additional notes"}

Please write a formal, professional email notification that:
1. Clearly states the hearing has been scheduled
2. Includes all relevant details
3. Explains what the recipient should bring or prepare
4. Provides contact information placeholder [CONTACT_INFO]
5. Has a professional closing

Format the email with Subject line and Body.`,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === "text");
  return textContent ? textContent.text : "Hearing notification email content";
}

async function sendHearingNotificationEmail(
  recipientEmail: string,
  emailContent: string,
  violationId: string,
): Promise<void> {
  console.log(`Sending hearing notification email to: ${recipientEmail}`);
  console.log(`Violation ID: ${violationId}`);
  console.log(`Email Content:\n${emailContent}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to schedule a hearing." },
        { status: 401 },
      );
    }

    const violationId = params.id;

    if (!violationId || isNaN(parseInt(violationId))) {
      return NextResponse.json(
        { error: "Invalid violation ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = hearingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { scheduled_at, location, notes } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        `SELECT v.*, u.email as reporter_email, u.name as reporter_name 
         FROM violations v 
         LEFT JOIN users u ON v.reporter_id = u.id 
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

      const existingHearingResult = await client.query(
        `SELECT id FROM hearings WHERE violation_id = $1 AND status != 'cancelled'`,
        [violationId],
      );

      if (existingHearingResult.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error:
              "An active hearing already exists for this violation. Please cancel it before scheduling a new one.",
          },
          { status: 409 },
        );
      }

      const hearingResult = await client.query(
        `INSERT INTO hearings (violation_id, scheduled_at, location, notes, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'scheduled', $5, NOW(), NOW())
         RETURNING *`,
        [violationId, scheduled_at, location, notes, session.user.email],
      );

      const hearing = hearingResult.rows[0];

      await client.query(
        `UPDATE violations SET status = 'hearing_scheduled', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await client.query("COMMIT");

      const emailContent = await generateHearingEmailContent(violation, {
        scheduled_at,
        location,
        notes,
      });

      const recipientEmail = violation.reporter_email || session.user.email;
      if (recipientEmail) {
        await sendHearingNotificationEmail(
          recipientEmail,
          emailContent,
          violationId,
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Hearing scheduled successfully",
          hearing: {
            id: hearing.id,
            violation_id: hearing.violation_id,
            scheduled_at: hearing.scheduled_at,
            location: hearing.location,
            notes: hearing.notes,
            status: hearing.status,
            created_at: hearing.created_at,
          },
          notification: {
            sent: !!recipientEmail,
            recipient: recipientEmail,
            email_preview: emailContent.substring(0, 200) + "...",
          },
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
    console.error("Error scheduling hearing:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error. Failed to schedule hearing." },
      { status: 500 },
    );
  }
}
