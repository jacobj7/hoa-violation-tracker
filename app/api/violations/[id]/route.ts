import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  notes: z.string().optional(),
  resolved_at: z.string().datetime().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const result = await pool.query(
      `SELECT
        v.id,
        v.title,
        v.description,
        v.status,
        v.severity,
        v.notes,
        v.created_at,
        v.updated_at,
        v.resolved_at,
        v.assigned_to,
        p.id AS property_id,
        p.name AS property_name,
        p.address AS property_address,
        p.city AS property_city,
        p.state AS property_state,
        p.zip AS property_zip,
        c.id AS category_id,
        c.name AS category_name,
        c.description AS category_description,
        c.color AS category_color
      FROM violations v
      LEFT JOIN properties p ON v.property_id = p.id
      LEFT JOIN violation_categories c ON v.category_id = c.id
      WHERE v.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];

    const violation = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at,
      assigned_to: row.assigned_to,
      property: row.property_id
        ? {
            id: row.property_id,
            name: row.property_name,
            address: row.property_address,
            city: row.property_city,
            state: row.property_state,
            zip: row.property_zip,
          }
        : null,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            description: row.category_description,
            color: row.category_color,
          }
        : null,
    };

    return NextResponse.json({ violation });
  } catch (error) {
    console.error("GET /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if ("resolved_at" in data) {
      setClauses.push(`resolved_at = $${paramIndex++}`);
      values.push(data.resolved_at ?? null);
    }

    if ("assigned_to" in data) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assigned_to ?? null);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE violations
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        title,
        description,
        status,
        severity,
        notes,
        created_at,
        updated_at,
        resolved_at,
        assigned_to,
        property_id,
        category_id
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ violation: result.rows[0] });
  } catch (error) {
    console.error("PATCH /api/violations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
