"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function NavBar() {
  const router = useRouter();
  const { data: session } = useSession();

  const role = (session?.user as any)?.role as string | undefined;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-6">
            <span className="text-xl font-bold text-gray-800">
              Violation Tracker
            </span>

            {role === "manager" && (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/violations/new"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  New Violation
                </Link>
              </>
            )}

            {role === "owner" && (
              <Link
                href="/portal"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Portal
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {session?.user?.name && (
              <span className="text-sm text-gray-500">{session.user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
