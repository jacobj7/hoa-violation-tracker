import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const createViolationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z
    .enum(["open", "in_progress", "resolved", "closed"])
    .optional()
    .default("open"),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
  reported_by: z.string().min(1).max(255).optional(),
  location: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const statusFilterSchema = z
  .enum(["open", "in_progress", "resolved", "closed"])
  .optional();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;

    const statusParse = statusFilterSchema.safeParse(statusParam);
    if (!statusParse.success) {
      return NextResponse.json(
        {
          error: "Invalid status filter",
          details: statusParse.error.flatten(),
        },
        { status: 400 },
      );
    }

    const status = statusParse.data;

    let result;
    if (status) {
      result = await query(
        "SELECT * FROM violations WHERE status = $1 ORDER BY created_at DESC",
        [status],
      );
    } else {
      result = await query(
        "SELECT * FROM violations ORDER BY created_at DESC",
        [],
      );
    }

    return NextResponse.json({
      violations: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error("GET /api/violations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch violations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createViolationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const {
      title,
      description,
      status,
      severity,
      reported_by,
      location,
      metadata,
    } = parsed.data;

    const result = await query(
      `INSERT INTO violations (title, description, status, severity, reported_by, location, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        title,
        description,
        status,
        severity,
        reported_by ?? null,
        location ?? null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    const violation = result.rows[0];

    return NextResponse.json({ violation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/violations error:", error);
    return NextResponse.json(
      { error: "Failed to create violation" },
      { status: 500 },
    );
  }
}
