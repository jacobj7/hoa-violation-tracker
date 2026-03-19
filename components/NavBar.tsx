"use client";

import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900">App</span>
          </div>

          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {session.user.name ?? session.user.email ?? "User"}
                  </span>
                  {(session.user as { role?: string }).role && (
                    <span className="text-xs text-gray-500 capitalize">
                      {(session.user as { role?: string }).role}
                    </span>
                  )}
                </div>

                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {(session.user.name ?? session.user.email ?? "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
