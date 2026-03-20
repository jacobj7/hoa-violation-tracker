import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            HOA Violation Tracker
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Streamline your homeowners association management with intelligent
            violation tracking, automated notifications, and AI-powered
            resolution assistance.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              Violation Management
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Log, track, and manage HOA violations with detailed records,
              photos, and status updates all in one place.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-purple-900 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              AI-Powered Assistance
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Leverage Claude AI to draft violation notices, suggest
              resolutions, and answer homeowner questions automatically.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-green-900 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              Resident Portal
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Give homeowners transparent access to their violation history,
              appeal processes, and community guidelines.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h4 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">
              For Board Members
            </h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Create and assign violations
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Track resolution progress
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Generate compliance reports
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Manage fine schedules
              </li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h4 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">
              For Homeowners
            </h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                View violation notices
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Submit appeals online
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Chat with AI assistant
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Access community rules
              </li>
            </ul>
          </div>
        </section>

        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 text-lg"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600 transition-colors duration-200 text-lg"
            >
              Create Account
            </Link>
          </div>
          <p className="text-slate-500 text-sm">
            Already managing your community?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </div>

      <footer className="border-t border-slate-700 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>
            © {new Date().getFullYear()} HOA Violation Tracker. Built for modern
            community management.
          </p>
        </div>
      </footer>
    </main>
  );
}
