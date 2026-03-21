"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              MyApp
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {status === "loading" && (
              <span className="text-sm text-gray-400">Loading...</span>
            )}

            {status === "authenticated" && session?.user && (
              <>
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User avatar"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-semibold">
                        {session.user.name
                          ? session.user.name.charAt(0).toUpperCase()
                          : (session.user.email?.charAt(0).toUpperCase() ??
                            "?")}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800 leading-tight">
                      {session.user.name ?? session.user.email}
                    </span>
                    {(session.user as { role?: string }).role && (
                      <span className="text-xs text-gray-500 leading-tight capitalize">
                        {(session.user as { role?: string }).role}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="ml-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  Sign out
                </button>
              </>
            )}

            {status === "unauthenticated" && (
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
