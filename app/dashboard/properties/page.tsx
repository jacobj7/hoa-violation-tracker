import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import PropertiesTable from "./PropertiesTable";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  status: string;
  monthly_rent: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  created_at: string;
  updated_at: string;
  owner_id: number;
  owner_name: string;
  owner_email: string;
}

async function getProperties(): Promise<Property[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<Property>(`
      SELECT 
        p.id,
        p.name,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        p.property_type,
        p.status,
        p.monthly_rent,
        p.bedrooms,
        p.bathrooms,
        p.square_feet,
        p.created_at,
        p.updated_at,
        p.owner_id,
        u.name AS owner_name,
        u.email AS owner_email
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const properties = await getProperties();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all properties and their details
          </p>
        </div>
      </div>
      <PropertiesTable properties={properties} />
    </div>
  );
}
