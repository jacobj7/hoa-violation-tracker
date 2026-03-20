import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import OwnerViolationsClient from "./OwnerViolationsClient";

async function getOwnerViolations(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/owner/violations`, {
    headers: {
      Cookie: `next-auth.session-token=${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch violations: ${res.statusText}`);
  }

  return res.json();
}

export default async function OwnerViolationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  let violations: unknown[] = [];
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/owner/violations`, {
      headers: {
        "x-user-id": (session.user as { id?: string }).id || "",
        "x-user-email": session.user.email || "",
        "x-user-role": (session.user as { role?: string }).role || "",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      violations = data.violations || data || [];
    } else {
      error = `Failed to load violations (${res.status})`;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error occurred";
  }

  const serializedViolations = JSON.parse(JSON.stringify(violations));

  return (
    <OwnerViolationsClient
      violations={serializedViolations}
      error={error}
      user={{
        id: (session.user as { id?: string }).id || "",
        email: session.user.email || "",
        name: session.user.name || "",
        role: (session.user as { role?: string }).role || "",
      }}
    />
  );
}
