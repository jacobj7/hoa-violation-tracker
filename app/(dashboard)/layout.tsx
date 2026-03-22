import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string })?.role ?? "inspector";

  const inspectorLinks = [
    { href: "/violations/new", label: "Report Violation" },
    { href: "/violations/my", label: "My Reports" },
    { href: "/profile", label: "Profile" },
  ];

  const managerLinks = [
    { href: "/violations", label: "All Violations" },
    { href: "/properties", label: "Properties" },
    { href: "/violations/new", label: "Report Violation" },
    { href: "/profile", label: "Profile" },
  ];

  const navLinks = role === "manager" ? managerLinks : inspectorLinks;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navLinks={navLinks} role={role} user={session.user} />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
