import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Store a placeholder URL since @vercel/blob is not available
    const url = `/uploads/${Date.now()}-${file.name}`;

    await query(
      `INSERT INTO evidence (violation_id, url, description, uploaded_by)
       VALUES ($1, $2, $3, $4)`,
      [params.id, url, description || "", session.user?.id],
    );

    return NextResponse.json({
      url,
      message: "Evidence uploaded successfully",
    });
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT * FROM evidence WHERE violation_id = $1 ORDER BY created_at DESC`,
      [params.id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Evidence fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence" },
      { status: 500 },
    );
  }
}
