"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AlertTriangle, Building2 } from "lucide-react";

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/dashboard/violations",
    label: "Violations",
    icon: AlertTriangle,
  },
  {
    href: "/dashboard/properties",
    label: "Properties",
    icon: Building2,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-gray-700 px-4">
        <span className="text-xl font-bold tracking-tight">ViolationTrack</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          &copy; {new Date().getFullYear()} ViolationTrack
        </p>
      </div>
    </aside>
  );
}
