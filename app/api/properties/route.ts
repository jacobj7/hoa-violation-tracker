import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "Zip code is required"),
  country: z.string().default("US"),
  price: z.number().positive("Price must be positive"),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  square_feet: z.number().positive().optional(),
  property_type: z
    .enum([
      "house",
      "apartment",
      "condo",
      "townhouse",
      "land",
      "commercial",
      "other",
    ])
    .default("house"),
  status: z.enum(["active", "pending", "sold", "inactive"]).default("active"),
  images: z.array(z.string().url()).optional(),
  amenities: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const status = searchParams.get("status");
  const property_type = searchParams.get("property_type");
  const city = searchParams.get("city");
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");

  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  conditions.push(`p.user_id = $${paramIndex++}`);
  values.push((session.user as { id: string }).id);

  if (status) {
    conditions.push(`p.status = $${paramIndex++}`);
    values.push(status);
  }

  if (property_type) {
    conditions.push(`p.property_type = $${paramIndex++}`);
    values.push(property_type);
  }

  if (city) {
    conditions.push(`p.city ILIKE $${paramIndex++}`);
    values.push(`%${city}%`);
  }

  if (minPrice) {
    conditions.push(`p.price >= $${paramIndex++}`);
    values.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    conditions.push(`p.price <= $${paramIndex++}`);
    values.push(parseFloat(maxPrice));
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const client = await pool.connect();

  try {
    const countResult = await client.query(
      `SELECT COUNT(*) FROM properties p ${whereClause}`,
      values,
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const dataValues = [...values, limit, offset];
    const result = await client.query(
      `SELECT p.* FROM properties p ${whereClause} ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataValues,
    );

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createPropertySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const data = parseResult.data;
  const userId = (session.user as { id: string }).id;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `INSERT INTO properties (
        user_id, title, description, address, city, state, zip_code, country,
        price, bedrooms, bathrooms, square_feet, property_type, status, images, amenities,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        NOW(), NOW()
      ) RETURNING *`,
      [
        userId,
        data.title,
        data.description ?? null,
        data.address,
        data.city,
        data.state,
        data.zip_code,
        data.country,
        data.price,
        data.bedrooms ?? null,
        data.bathrooms ?? null,
        data.square_feet ?? null,
        data.property_type,
        data.status,
        data.images ? JSON.stringify(data.images) : null,
        data.amenities ? JSON.stringify(data.amenities) : null,
      ],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
