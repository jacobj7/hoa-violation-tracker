import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "inspector") {
    redirect("/dashboard/inspector");
  } else if (role === "board") {
    redirect("/dashboard/board");
  } else if (role === "owner") {
    redirect("/dashboard/owner");
  } else {
    redirect("/login");
  }
}
