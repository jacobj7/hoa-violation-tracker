"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userName: string;
  role: string;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/violations", label: "Violations" },
  { href: "/violations/new", label: "New Violation" },
  { href: "/properties", label: "Properties" },
];

export function Sidebar({ userName, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="px-6 py-8 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white mb-1">HOA Manager</h1>
        <div className="mt-4">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-400 capitalize">{role}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} HOA Manager
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
