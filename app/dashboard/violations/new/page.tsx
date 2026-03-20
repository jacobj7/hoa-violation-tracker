import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewViolationClient from "@/app/dashboard/inspector/violations/new/NewViolationClient";

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "inspector") redirect("/dashboard");

  let properties: Record<string, unknown>[] = [];
  let categories: Record<string, unknown>[] = [];

  try {
    const propsResult = await db.query(
      "SELECT id, address FROM properties ORDER BY address",
    );
    properties = propsResult.rows;
  } catch (e) {
    console.error("Error fetching properties:", e);
  }

  try {
    const catsResult = await db.query(
      "SELECT id, name FROM violation_categories ORDER BY name",
    );
    categories = catsResult.rows;
  } catch (e) {
    console.error("Error fetching categories:", e);
  }

  return <NewViolationClient properties={properties} categories={categories} />;
}
