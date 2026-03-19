import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["open", "resolved", "pending", "all"]).default("all"),
  unit_id: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerId = session.user.id;

    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      unit_id: searchParams.get("unit_id") ?? undefined,
    };

    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit, status, unit_id } = parsed.data;
    const offset = (page - 1) * limit;

    // Verify owner exists and get their properties
    const ownerResult = await db.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'owner'`,
      [ownerId],
    );

    if (ownerResult.rows.length === 0) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // Build the violations query scoped to owner's properties
    const conditions: string[] = [`p.owner_id = $1`];
    const params: (string | number)[] = [ownerId];
    let paramIndex = 2;

    if (status !== "all") {
      conditions.push(`v.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (unit_id !== undefined) {
      conditions.push(`u.id = $${paramIndex}`);
      params.push(unit_id);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      JOIN units u ON v.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.title,
        v.description,
        v.status,
        v.severity,
        v.created_at,
        v.updated_at,
        v.resolved_at,
        u.id AS unit_id,
        u.unit_number,
        p.id AS property_id,
        p.name AS property_name,
        p.address AS property_address,
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.email AS tenant_email
      FROM violations v
      JOIN units u ON v.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN tenants t ON v.tenant_id = t.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countParams = [...params];
    const dataParams = [...params, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, countParams),
      db.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);
    const totalPages = Math.ceil(total / limit);

    const violations = dataResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      unit: {
        id: row.unit_id,
        unitNumber: row.unit_number,
      },
      property: {
        id: row.property_id,
        name: row.property_name,
        address: row.property_address,
      },
      tenant: row.tenant_id
        ? {
            id: row.tenant_id,
            name: row.tenant_name,
            email: row.tenant_email,
          }
        : null,
    }));

    return NextResponse.json({
      data: violations,
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
    console.error("Error fetching owner violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
