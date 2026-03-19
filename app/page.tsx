import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
            HOA Violation Management System
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            A streamlined platform for managing homeowner association
            violations, tracking compliance, and facilitating communication
            between property managers and homeowners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
          <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center space-y-4 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold text-slate-800">
                Property Manager
              </h2>
              <p className="text-sm text-slate-500">
                Log violations, manage cases, and oversee compliance across all
                properties.
              </p>
            </div>
            <Link
              href="/manager/login"
              className="w-full mt-2 inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Manager Login
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center space-y-4 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold text-slate-800">
                Property Owner
              </h2>
              <p className="text-sm text-slate-500">
                View violations on your property, respond to notices, and track
                resolution status.
              </p>
            </div>
            <Link
              href="/owner/login"
              className="w-full mt-2 inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Owner Portal Login
            </Link>
          </div>
        </div>

        <p className="text-xs text-slate-400 pt-4">
          &copy; {new Date().getFullYear()} HOA Violation Management System. All
          rights reserved.
        </p>
      </div>
    </main>
  );
}
