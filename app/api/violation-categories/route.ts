import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fine_amount: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(
      "SELECT * FROM violation_categories ORDER BY name ASC",
      [],
    );

    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    console.error("Error fetching violation categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    const result = await query(
      `INSERT INTO violation_categories (name, description, fine_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        validatedData.name,
        validatedData.description || null,
        validatedData.fine_amount,
      ],
    );

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating violation category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
