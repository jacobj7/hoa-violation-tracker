import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
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

    const { name, email, password } = validationResult.data;

    const client = await pool.connect();

    try {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()],
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }

      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, name, email, created_at`,
        [name, email.toLowerCase(), password_hash],
      );

      const newUser = result.rows[0];

      return NextResponse.json(
        {
          message: "User registered successfully",
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            createdAt: newUser.created_at,
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
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
