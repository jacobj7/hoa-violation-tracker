import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

interface NavLink {
  href: string;
  label: string;
  roles: string[];
}

const navLinks: NavLink[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
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

interface SidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
}

function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const filteredLinks = navLinks.filter((link) =>
    link.roles.includes(userRole),
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-gray-700 px-4">
        <span className="text-xl font-bold tracking-tight">AppName</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {filteredLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-700 px-4 py-4">
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-white truncate">
            {userName}
          </span>
          <span className="text-xs text-gray-400 truncate">{userEmail}</span>
          <span className="inline-flex items-center mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white capitalize">
              {userRole}
            </span>
          </span>
        </div>
        <Link
          href="/api/auth/signout"
          className="mt-3 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150 w-full"
        >
          Sign out
        </Link>
      </div>
    </aside>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role ?? "user";
  const userName = session.user.name ?? "User";
  const userEmail = session.user.email ?? "";

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
