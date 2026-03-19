"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  PlusCircle,
  Building2,
  DollarSign,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/violations",
    label: "Violations",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    href: "/violations/new",
    label: "New Violation",
    icon: <PlusCircle className="w-5 h-5" />,
    roles: ["inspector"],
  },
  {
    href: "/properties",
    label: "Properties",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    href: "/fines",
    label: "Fines",
    icon: <DollarSign className="w-5 h-5" />,
    roles: ["board_member", "property_manager"],
  },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userRole = (session?.user as any)?.role as string | undefined;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="px-6 py-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white tracking-tight">
          HOA Manager
        </h1>
        {session?.user && (
          <div className="mt-2">
            <p className="text-sm text-gray-300 truncate">
              {session.user.name || session.user.email}
            </p>
            {userRole && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-indigo-600 text-indigo-100 rounded-full capitalize">
                {userRole.replace("_", " ")}
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className={isActive ? "text-white" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
