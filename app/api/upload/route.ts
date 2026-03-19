import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided or invalid file" },
        { status: 400 },
      );
    }

    const validation = uploadSchema.safeParse({
      filename: file.name,
      contentType: file.type,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid file metadata", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { filename, contentType } = validation.data;

    const blob = await put(filename, file, {
      access: "public",
      contentType,
    });

    return NextResponse.json(
      {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Upload failed", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
