import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PropertySchema = z.object({
  id: z.number(),
  address: z.string(),
  unit: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  created_at: z.string(),
});

const ViolationSchema = z.object({
  id: z.number(),
  property_id: z.number(),
  description: z.string(),
  status: z.string(),
  issued_at: z.string(),
  resolved_at: z.string().nullable(),
});

const FineSchema = z.object({
  id: z.number(),
  violation_id: z.number(),
  amount: z.string(),
  due_date: z.string().nullable(),
  paid_at: z.string().nullable(),
  status: z.string(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();

    try {
      // Get owner record by email
      const ownerResult = await client.query(
        `SELECT id, name, email, phone FROM owners WHERE email = $1 LIMIT 1`,
        [session.user.email],
      );

      if (ownerResult.rows.length === 0) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }

      const owner = ownerResult.rows[0];

      // Get properties for this owner
      const propertiesResult = await client.query(
        `SELECT id, address, unit, city, state, zip, created_at::text
         FROM properties
         WHERE owner_id = $1
         ORDER BY created_at DESC`,
        [owner.id],
      );

      const properties = propertiesResult.rows;
      const propertyIds = properties.map((p: { id: number }) => p.id);

      let violations: Record<string, unknown>[] = [];
      let fines: Record<string, unknown>[] = [];

      if (propertyIds.length > 0) {
        // Get violations for all properties
        const violationsResult = await client.query(
          `SELECT id, property_id, description, status, issued_at::text, resolved_at::text
           FROM violations
           WHERE property_id = ANY($1::int[])
           ORDER BY issued_at DESC`,
          [propertyIds],
        );

        violations = violationsResult.rows;
        const violationIds = violations.map((v: { id: number }) => v.id);

        if (violationIds.length > 0) {
          // Get fines for all violations
          const finesResult = await client.query(
            `SELECT id, violation_id, amount::text, due_date::text, paid_at::text, status
             FROM fines
             WHERE violation_id = ANY($1::int[])
             ORDER BY due_date ASC`,
            [violationIds],
          );

          fines = finesResult.rows;
        }
      }

      // Validate and parse data
      const parsedProperties = z.array(PropertySchema).parse(
        properties.map((p) => ({
          ...p,
          created_at: p.created_at ?? new Date().toISOString(),
        })),
      );

      const parsedViolations = z.array(ViolationSchema).parse(
        violations.map((v) => ({
          ...v,
          issued_at: v.issued_at ?? new Date().toISOString(),
        })),
      );

      const parsedFines = z.array(FineSchema).parse(fines);

      // Group violations by property and fines by violation
      const violationsByProperty: Record<
        number,
        z.infer<typeof ViolationSchema>[]
      > = {};
      for (const violation of parsedViolations) {
        if (!violationsByProperty[violation.property_id]) {
          violationsByProperty[violation.property_id] = [];
        }
        violationsByProperty[violation.property_id].push(violation);
      }

      const finesByViolation: Record<number, z.infer<typeof FineSchema>[]> = {};
      for (const fine of parsedFines) {
        if (!finesByViolation[fine.violation_id]) {
          finesByViolation[fine.violation_id] = [];
        }
        finesByViolation[fine.violation_id].push(fine);
      }

      // Build enriched response
      const enrichedProperties = parsedProperties.map((property) => {
        const propertyViolations = (
          violationsByProperty[property.id] ?? []
        ).map((violation) => ({
          ...violation,
          fines: finesByViolation[violation.id] ?? [],
        }));

        const totalFines = propertyViolations
          .flatMap((v) => v.fines)
          .reduce((sum, fine) => sum + parseFloat(fine.amount), 0);

        const unpaidFines = propertyViolations
          .flatMap((v) => v.fines)
          .filter((fine) => fine.status !== "paid")
          .reduce((sum, fine) => sum + parseFloat(fine.amount), 0);

        return {
          ...property,
          violations: propertyViolations,
          summary: {
            total_violations: propertyViolations.length,
            open_violations: propertyViolations.filter(
              (v) => v.status === "open",
            ).length,
            total_fines: totalFines.toFixed(2),
            unpaid_fines: unpaidFines.toFixed(2),
          },
        };
      });

      const overallSummary = {
        total_properties: enrichedProperties.length,
        total_violations: parsedViolations.length,
        open_violations: parsedViolations.filter((v) => v.status === "open")
          .length,
        total_fines: parsedFines
          .reduce((sum, fine) => sum + parseFloat(fine.amount), 0)
          .toFixed(2),
        unpaid_fines: parsedFines
          .filter((fine) => fine.status !== "paid")
          .reduce((sum, fine) => sum + parseFloat(fine.amount), 0)
          .toFixed(2),
      };

      return NextResponse.json({
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
        },
        properties: enrichedProperties,
        summary: overallSummary,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching owner data:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Data validation error", details: error.errors },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
