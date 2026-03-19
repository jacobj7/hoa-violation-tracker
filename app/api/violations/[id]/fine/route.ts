import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const fineSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid due_date format",
  }),
  notes: z.string().optional(),
});

async function sendFineNotificationEmail(params: {
  recipientEmail: string;
  recipientName: string;
  violationId: string;
  fineId: string;
  amount: number;
  dueDate: string;
  violationDescription: string;
}) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a professional fine notification email for the following details:
- Recipient Name: ${params.recipientName}
- Violation ID: ${params.violationId}
- Fine ID: ${params.fineId}
- Fine Amount: $${params.amount.toFixed(2)}
- Due Date: ${params.dueDate}
- Violation Description: ${params.violationDescription}

Please write a formal, clear, and professional email notification informing the recipient about the fine. Include all the details provided and instructions to pay by the due date.`,
      },
    ],
  });

  const emailContent =
    message.content[0].type === "text" ? message.content[0].text : "";

  console.log("Fine notification email generated:");
  console.log(`To: ${params.recipientEmail}`);
  console.log(`Subject: Fine Notification - Fine #${params.fineId}`);
  console.log(emailContent);

  return emailContent;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const violationId = params.id;

    if (!violationId) {
      return NextResponse.json(
        { error: "Violation ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = fineSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { amount, due_date, notes } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const violationResult = await client.query(
        `SELECT v.*, u.email as user_email, u.name as user_name 
         FROM violations v
         LEFT JOIN users u ON v.user_id = u.id
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

      const fineResult = await client.query(
        `INSERT INTO fines (violation_id, amount, due_date, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
         RETURNING *`,
        [violationId, amount, due_date, notes || null],
      );

      const fine = fineResult.rows[0];

      await client.query(
        `UPDATE violations SET status = 'fined', updated_at = NOW() WHERE id = $1`,
        [violationId],
      );

      await client.query("COMMIT");

      if (violation.user_email) {
        try {
          await sendFineNotificationEmail({
            recipientEmail: violation.user_email,
            recipientName: violation.user_name || "Resident",
            violationId: violationId,
            fineId: fine.id.toString(),
            amount: amount,
            dueDate: due_date,
            violationDescription:
              violation.description || "Community violation",
          });
        } catch (emailError) {
          console.error("Failed to send fine notification email:", emailError);
        }
      }

      return NextResponse.json(
        {
          success: true,
          fine: {
            id: fine.id,
            violation_id: fine.violation_id,
            amount: fine.amount,
            due_date: fine.due_date,
            notes: fine.notes,
            status: fine.status,
            created_at: fine.created_at,
            updated_at: fine.updated_at,
          },
          message: "Fine created successfully",
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
    console.error("Error creating fine:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
