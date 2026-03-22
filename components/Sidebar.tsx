"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: string;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/violations", label: "Violations" },
  { href: "/violations/report", label: "Report Violation" },
];

const managerLinks = [{ href: "/violation-types", label: "Violation Types" }];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const links = role === "manager" ? [...navLinks, ...managerLinks] : navLinks;

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">HOA Manager</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 capitalize">Role: {role}</p>
      </div>
    </aside>
  );
}
