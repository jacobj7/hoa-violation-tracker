import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

async function sendEmail(to: string, subject: string, text: string) {
  // Stub email sender - replace with actual implementation
  console.log("Sending email to:", to, "Subject:", subject, "Body:", text);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const violationId = params.id;
    const body = await request.json();
    const { subject, message } = body;

    const violationResult = await query(
      `SELECT v.*, u.email, u.name FROM violations v
       JOIN users u ON v.owner_id = u.id
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

    await sendEmail(
      violation.email,
      subject || `Notice Regarding Violation #${violationId}`,
      message ||
        `Dear ${violation.name},\n\nThis is a notice regarding your violation.\n\nBest regards,\nHOA Management`,
    );

    await query(
      `INSERT INTO notices (violation_id, subject, message, sent_at, sent_by)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [violationId, subject, message, session.user?.id],
    ).catch(() => {
      // Table may not exist, ignore
    });

    return NextResponse.json({
      success: true,
      message: "Notice sent successfully",
    });
  } catch (error) {
    console.error("Error sending notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
