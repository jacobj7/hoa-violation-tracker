"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  AlertTriangle,
  PlusCircle,
  Building2,
  Tag,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/violations",
    label: "Violations",
    icon: AlertTriangle,
  },
  {
    href: "/violations/new",
    label: "New Violation",
    icon: PlusCircle,
  },
  {
    href: "/properties",
    label: "Properties",
    icon: Building2,
  },
  {
    href: "/categories",
    label: "Categories",
    icon: Tag,
  },
];

function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Logo / App Name */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
        <ShieldCheck className="w-6 h-6 text-indigo-400" />
        <span className="text-lg font-semibold tracking-tight">
          ViolationMgr
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Sign Out */}
      <div className="px-4 py-4 border-t border-gray-700 space-y-3">
        {session?.user && (
          <div className="px-2 space-y-1">
            <p className="text-xs text-gray-400 truncate">
              {session.user.email}
            </p>
            {(session.user as { role?: string }).role && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-300 capitalize">
                <ShieldCheck className="w-3 h-3" />
                {(session.user as { role?: string }).role}
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export { Sidebar };
export default Sidebar;
