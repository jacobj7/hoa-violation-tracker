import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "Zip code is required"),
  country: z.string().default("US"),
  price: z.number().positive("Price must be positive"),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
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
  owner_name: z.string().min(1, "Owner name is required"),
  owner_email: z.string().email("Valid owner email is required"),
  owner_phone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status");
    const property_type = searchParams.get("property_type");
    const city = searchParams.get("city");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

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

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM properties p
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        p.country,
        p.price,
        p.bedrooms,
        p.bathrooms,
        p.square_feet,
        p.property_type,
        p.status,
        p.created_at,
        p.updated_at,
        o.id as owner_id,
        o.name as owner_name,
        o.email as owner_email,
        o.phone as owner_phone
      FROM properties p
      LEFT JOIN property_owners o ON p.owner_id = o.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countValues = [...values];
    const dataValues = [...values, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, countValues),
      client.query(dataQuery, dataValues),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    const properties = dataResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      country: row.country,
      price: parseFloat(row.price),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms ? parseFloat(row.bathrooms) : null,
      square_feet: row.square_feet ? parseFloat(row.square_feet) : null,
      property_type: row.property_type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      owner: row.owner_id
        ? {
            id: row.owner_id,
            name: row.owner_name,
            email: row.owner_email,
            phone: row.owner_phone,
          }
        : null,
    }));

    return NextResponse.json({
      properties,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validationResult = createPropertySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    await client.query("BEGIN");

    // Upsert owner by email
    const ownerResult = await client.query(
      `
      INSERT INTO property_owners (name, email, phone, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, property_owners.phone),
            updated_at = NOW()
      RETURNING id, name, email, phone
      `,
      [data.owner_name, data.owner_email, data.owner_phone || null],
    );

    const owner = ownerResult.rows[0];

    // Create property
    const propertyResult = await client.query(
      `
      INSERT INTO properties (
        title,
        description,
        address,
        city,
        state,
        zip_code,
        country,
        price,
        bedrooms,
        bathrooms,
        square_feet,
        property_type,
        status,
        owner_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        data.title,
        data.description || null,
        data.address,
        data.city,
        data.state,
        data.zip_code,
        data.country,
        data.price,
        data.bedrooms || null,
        data.bathrooms || null,
        data.square_feet || null,
        data.property_type,
        data.status,
        owner.id,
      ],
    );

    await client.query("COMMIT");

    const property = propertyResult.rows[0];

    return NextResponse.json(
      {
        property: {
          id: property.id,
          title: property.title,
          description: property.description,
          address: property.address,
          city: property.city,
          state: property.state,
          zip_code: property.zip_code,
          country: property.country,
          price: parseFloat(property.price),
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms ? parseFloat(property.bathrooms) : null,
          square_feet: property.square_feet
            ? parseFloat(property.square_feet)
            : null,
          property_type: property.property_type,
          status: property.status,
          created_at: property.created_at,
          updated_at: property.updated_at,
          owner: {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
