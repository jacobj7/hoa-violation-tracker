import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const violationId = params.id;

    const result = await query("SELECT * FROM violations WHERE id = $1", [
      violationId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = result.rows[0];

    // Generate a simple text-based notice instead of PDF
    const noticeText = `
VIOLATION NOTICE
================
Violation ID: ${violation.id}
Description: ${violation.description || "N/A"}
Status: ${violation.status}
Date: ${new Date(violation.created_at).toLocaleDateString()}

This is an official violation notice.
    `.trim();

    return new NextResponse(noticeText, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="violation-notice-${violationId}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error generating notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
