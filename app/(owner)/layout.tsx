import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  if ((session.user as { role?: string }).role !== "owner") {
    redirect("/login");
  }

  const ownerName = session.user.name || session.user.email || "Owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
              >
                Owner Portal
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/properties"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Properties
                </Link>
                <Link
                  href="/tenants"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Tenants
                </Link>
                <Link
                  href="/reports"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Reports
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome,{" "}
                <span className="font-medium text-gray-900">{ownerName}</span>
              </span>
              <Link
                href="/api/auth/signout"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
