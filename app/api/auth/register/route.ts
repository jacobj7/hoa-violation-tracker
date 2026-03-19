import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "moderator", "member"]).default("member"),
  community_id: z.string().uuid("Invalid community ID").optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, name, role, community_id } = validationResult.data;

    const client = await pool.connect();
    try {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 },
        );
      }

      const saltRounds = 12;
      const hashedPassword = await bcryptjs.hash(password, saltRounds);

      const result = await client.query(
        `INSERT INTO users (email, password, name, role, community_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, name, role, community_id, created_at`,
        [email, hashedPassword, name, role, community_id ?? null],
      );

      const newUser = result.rows[0];

      return NextResponse.json(
        {
          message: "User registered successfully",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            community_id: newUser.community_id,
            created_at: newUser.created_at,
          },
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
