import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewViolationForm from "./NewViolationForm";

export const metadata = {
  title: "Submit New Violation",
};

async function getProperties() {
  const result = await db.query(
    `SELECT id, address, unit_number, city, state, zip_code 
     FROM properties 
     ORDER BY address ASC`,
  );
  return result.rows;
}

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const properties = await getProperties();

  const serializedProperties = properties.map((p: any) => ({
    id: String(p.id),
    address: p.address as string,
    unitNumber: p.unit_number as string | null,
    city: p.city as string,
    state: p.state as string,
    zipCode: p.zip_code as string,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Submit New Violation
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Report a new violation for a property. All fields marked with an
          asterisk (*) are required.
        </p>
      </div>
      <NewViolationForm properties={serializedProperties} />
    </div>
  );
}
