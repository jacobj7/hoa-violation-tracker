import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string })?.role;

  const navLinks = [
    {
      href: "/dashboard",
      label: "Overview",
      roles: ["admin", "user", "manager"],
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      roles: ["admin", "user", "manager"],
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      roles: ["admin", "manager"],
    },
    { href: "/dashboard/users", label: "Users", roles: ["admin"] },
    {
      href: "/dashboard/settings",
      label: "Settings",
      roles: ["admin", "user", "manager"],
    },
  ];

  const filteredLinks = navLinks.filter(
    (link) => !role || link.roles.includes(role),
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo / Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
            AppDashboard
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User info + Sign out */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session.user?.name ?? session.user?.email ?? "User"}
            </p>
            {session.user?.email && (
              <p className="text-xs text-gray-500 truncate">
                {session.user.email}
              </p>
            )}
            {role && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full capitalize">
                {role}
              </span>
            )}
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
        </header>
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
