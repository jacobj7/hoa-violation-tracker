import Link from "next/link";
import { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                href="/portal"
                className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                Owner Portal
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href="/portal/my-violations"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
                >
                  My Violations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
