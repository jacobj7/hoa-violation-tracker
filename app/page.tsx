import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Welcome</h1>
          <p className="text-xl text-slate-300">
            Sign in to your account or create a new one to get started.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Create Account
          </Link>
        </div>

        <div className="pt-8 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            Secure, fast, and reliable. Get started in seconds.
          </p>
        </div>
      </div>
    </main>
  );
}
