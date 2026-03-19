import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
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
        { error: "Invalid property ID" },
        { status: 400 },
      );
    }

    const { id: propertyId } = parsedParams.data;
    const userId = session.user.id;
    const userRole = session.user.role;

    // If the user is an owner, verify they own this property
    if (userRole === "owner") {
      const propertyCheck = await db.query(
        `SELECT id FROM properties WHERE id = $1 AND owner_id = $2`,
        [propertyId, userId],
      );

      if (propertyCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Property not found or access denied" },
          { status: 403 },
        );
      }
    } else if (userRole !== "admin" && userRole !== "inspector") {
      // Only owners, admins, and inspectors can access violations
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const offset = (page - 1) * limit;
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    let query = `
      SELECT
        v.id,
        v.property_id,
        v.description,
        v.status,
        v.severity,
        v.created_at,
        v.updated_at,
        v.resolved_at,
        v.inspector_id,
        u.name AS inspector_name,
        u.email AS inspector_email
      FROM violations v
      LEFT JOIN users u ON v.inspector_id = u.id
      WHERE v.property_id = $1
    `;

    const queryParams: (string | number)[] = [propertyId];
    let paramIndex = 2;

    if (status) {
      query += ` AND v.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (severity) {
      query += ` AND v.severity = $${paramIndex}`;
      queryParams.push(severity);
      paramIndex++;
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM violations v
      WHERE v.property_id = $1
      ${status ? `AND v.status = $2` : ""}
      ${severity ? `AND v.severity = $${status ? 3 : 2}` : ""}
    `;

    const countParams: (string | number)[] = [propertyId];
    if (status) countParams.push(status);
    if (severity) countParams.push(severity);

    const [violationsResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      violations: violationsResult.rows,
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
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
