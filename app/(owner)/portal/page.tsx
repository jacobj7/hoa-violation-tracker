import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import OwnerPortalClient from "./OwnerPortalClient";

export default async function OwnerPortalPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "owner") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <OwnerPortalClient user={session.user} />
    </main>
  );
}
