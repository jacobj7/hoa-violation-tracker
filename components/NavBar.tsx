"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignOutButton } from "./SignOutButton";

export function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              HOA Manager
            </Link>
            {session && (
              <div className="flex space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {session.user?.role === "admin" && (
                  <Link
                    href="/fines"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Fines
                  </Link>
                )}
                {session.user?.role === "owner" && (
                  <Link
                    href="/owner/violations"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    My Violations
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-gray-600 text-sm">
                  {session.user?.email}
                </span>
                <SignOutButton />
              </>
            ) : (
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
