import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = await put(`violations/${params.id}/${file.name}`, file, {
      access: "public",
    });

    await query(
      "INSERT INTO violation_evidence (violation_id, url, filename, uploaded_by) VALUES ($1, $2, $3, $4)",
      [params.id, blob.url, file.name, session.user?.email],
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
