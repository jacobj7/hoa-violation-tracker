import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid violation ID",
          details: parsedParams.error.flatten(),
        },
        { status: 400 },
      );
    }

    const violationId = parsedParams.data.id;

    const violationResult = await db.query(
      "SELECT id FROM violations WHERE id = $1",
      [violationId],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided or invalid file" },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `violations/${violationId}/evidence/${timestamp}_${sanitizedFileName}`;

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type,
    });

    const description = formData.get("description");
    const descriptionValue =
      description && typeof description === "string" ? description : null;

    const userId = (session.user as { id?: string }).id ?? null;

    const insertResult = await db.query(
      `INSERT INTO evidence (violation_id, blob_url, file_name, file_type, file_size, description, uploaded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, violation_id, blob_url, file_name, file_type, file_size, description, uploaded_by, created_at`,
      [
        violationId,
        blob.url,
        file.name,
        file.type,
        file.size,
        descriptionValue,
        userId,
      ],
    );

    const evidence = insertResult.rows[0];

    return NextResponse.json(
      {
        message: "Evidence uploaded successfully",
        evidence: {
          id: evidence.id,
          violationId: evidence.violation_id,
          blobUrl: evidence.blob_url,
          fileName: evidence.file_name,
          fileType: evidence.file_type,
          fileSize: evidence.file_size,
          description: evidence.description,
          uploadedBy: evidence.uploaded_by,
          createdAt: evidence.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error uploading evidence:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to upload evidence", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
