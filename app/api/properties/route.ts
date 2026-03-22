import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const propertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip_code: z.string().min(5, "ZIP code is required"),
  property_type: z.enum(["residential", "commercial", "industrial", "mixed"]),
  owner_name: z.string().min(1, "Owner name is required"),
  owner_email: z.string().email("Valid email is required").optional(),
  owner_phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const property_type = searchParams.get("property_type") || "";
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (address ILIKE $${paramIndex} OR owner_name ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (property_type) {
      whereClause += ` AND property_type = $${paramIndex}`;
      params.push(property_type);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM properties ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0].count);

    const propertiesResult = await query(
      `SELECT * FROM properties ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      properties: propertiesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
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
    const validatedData = propertySchema.parse(body);

    const result = await query(
      `INSERT INTO properties (address, city, state, zip_code, property_type, owner_name, owner_email, owner_phone, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        validatedData.address,
        validatedData.city,
        validatedData.state,
        validatedData.zip_code,
        validatedData.property_type,
        validatedData.owner_name,
        validatedData.owner_email || null,
        validatedData.owner_phone || null,
        validatedData.notes || null,
        session.user?.email || null,
      ],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
