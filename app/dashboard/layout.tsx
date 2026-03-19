import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const roleNavItems: Record<string, { href: string; label: string }[]> = {
  manager: [
    { href: "/dashboard/violations", label: "Violations Queue" },
    { href: "/dashboard/violations/new", label: "New Violation" },
    { href: "/dashboard/hearings", label: "Hearings" },
  ],
  inspector: [
    { href: "/dashboard/violations", label: "Violations Queue" },
    { href: "/dashboard/violations/new", label: "New Violation" },
    { href: "/dashboard/hearings", label: "Hearings" },
  ],
  board: [
    { href: "/dashboard/violations", label: "Violations Queue" },
    { href: "/dashboard/hearings", label: "Hearings" },
  ],
};

const allowedRoles = ["manager", "inspector", "board"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role ?? "";

  if (!allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }

  const navItems = roleNavItems[role] ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">HOA Portal</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{role}</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 text-sm font-semibold">
                {session.user.name?.charAt(0)?.toUpperCase() ??
                  session.user.email?.charAt(0)?.toUpperCase() ??
                  "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name ?? session.user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST" className="mt-3">
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
