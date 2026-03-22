import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const updateViolationSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "appealed"]).optional(),
  description: z.string().min(1).optional(),
  fine_amount: z.number().nonnegative().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await query(
      `SELECT v.*, 
              vc.name as category_name, 
              vc.description as category_description,
              p.address as property_address,
              p.unit_number,
              u.name as owner_name,
              u.email as owner_email
       FROM violations v
       LEFT JOIN violation_categories vc ON v.category_id = vc.id
       LEFT JOIN properties p ON v.property_id = p.id
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE v.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = result.rows[0];

    // Non-admin users can only view violations for their own properties
    if (session.user.role !== "admin") {
      const propertyCheck = await query(
        `SELECT p.owner_id FROM properties p
         JOIN violations v ON v.property_id = p.id
         WHERE v.id = $1`,
        [id],
      );

      if (
        propertyCheck.rows.length === 0 ||
        propertyCheck.rows[0].owner_id !== session.user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ violation });
  } catch (error) {
    console.error("Error fetching violation:", error);
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const validatedData = updateViolationSchema.parse(body);

    // Check violation exists
    const existingViolation = await query(
      `SELECT v.*, p.owner_id FROM violations v
       JOIN properties p ON v.property_id = p.id
       WHERE v.id = $1`,
      [id],
    );

    if (existingViolation.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = existingViolation.rows[0];

    // Non-admin users can only update status to "appealed" on their own violations
    if (session.user.role !== "admin") {
      if (violation.owner_id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const allowedFields = Object.keys(validatedData);
      const nonAdminAllowedFields = ["status"];
      const hasDisallowedFields = allowedFields.some(
        (field) => !nonAdminAllowedFields.includes(field),
      );

      if (hasDisallowedFields) {
        return NextResponse.json(
          {
            error: "Forbidden: insufficient permissions to update these fields",
          },
          { status: 403 },
        );
      }

      if (validatedData.status && validatedData.status !== "appealed") {
        return NextResponse.json(
          { error: "Forbidden: you can only set status to appealed" },
          { status: 403 },
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(validatedData.status);
    }
    if (validatedData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(validatedData.description);
    }
    if (validatedData.fine_amount !== undefined) {
      updates.push(`fine_amount = $${paramIndex++}`);
      values.push(validatedData.fine_amount);
    }
    if (validatedData.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(validatedData.due_date);
    }
    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(validatedData.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE violations SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return NextResponse.json({ violation: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error updating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const result = await query(
      `DELETE FROM violations WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Violation deleted successfully" });
  } catch (error) {
    console.error("Error deleting violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
