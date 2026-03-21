import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Welcome to the Platform
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            A powerful, role-based application built with Next.js 14,
            PostgreSQL, and AI-powered features. Get started by signing in or
            creating an account.
          </p>

          {session ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-300 text-lg">
                Welcome back,{" "}
                <span className="font-semibold text-white">
                  {session.user?.name ?? session.user?.email}
                </span>
                !
              </p>
              <div className="flex gap-4 flex-wrap justify-center">
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
                >
                  Sign Out
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/login"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors duration-200 shadow-lg border border-slate-600"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-xl font-bold mb-2 text-white">
              Secure Authentication
            </h3>
            <p className="text-slate-400">
              Role-based access control with NextAuth.js. Separate dashboards
              for admins, managers, and users.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2 text-white">AI-Powered</h3>
            <p className="text-slate-400">
              Integrated with Claude AI via the Anthropic SDK for intelligent
              features and automation.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <div className="text-3xl mb-4">🗄️</div>
            <h3 className="text-xl font-bold mb-2 text-white">
              PostgreSQL Backend
            </h3>
            <p className="text-slate-400">
              Robust data persistence with PostgreSQL, featuring type-safe
              queries and Zod validation.
            </p>
          </div>
        </div>

        {/* Role Dashboards Section */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg mb-20">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Role-Based Dashboards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-700/50">
              <div className="text-2xl mb-2">👑</div>
              <h4 className="font-semibold text-white mb-1">Admin</h4>
              <p className="text-slate-400 text-sm">
                Full system access, user management, and analytics.
              </p>
              {session?.user?.role === "admin" && (
                <Link
                  href="/admin/dashboard"
                  className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Go to Admin Dashboard →
                </Link>
              )}
            </div>

            <div className="text-center p-4 rounded-lg bg-slate-700/50">
              <div className="text-2xl mb-2">🏢</div>
              <h4 className="font-semibold text-white mb-1">Manager</h4>
              <p className="text-slate-400 text-sm">
                Team oversight, reporting, and resource management.
              </p>
              {(session?.user?.role === "manager" ||
                session?.user?.role === "admin") && (
                <Link
                  href="/manager/dashboard"
                  className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Go to Manager Dashboard →
                </Link>
              )}
            </div>

            <div className="text-center p-4 rounded-lg bg-slate-700/50">
              <div className="text-2xl mb-2">👤</div>
              <h4 className="font-semibold text-white mb-1">User</h4>
              <p className="text-slate-400 text-sm">
                Personal workspace, tasks, and profile management.
              </p>
              {session && (
                <Link
                  href="/dashboard"
                  className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Go to Dashboard →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm">
          <p>
            Built with Next.js 14 · PostgreSQL · NextAuth.js · Anthropic Claude
            · Zod
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <Link
              href="/login"
              className="hover:text-slate-300 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="hover:text-slate-300 transition-colors"
            >
              Register
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-slate-300 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
