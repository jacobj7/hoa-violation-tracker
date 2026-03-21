import { Suspense } from "react";
import NewViolationClient from "./NewViolationClient";

export const metadata = {
  title: "Report New Violation",
  description: "Submit a new violation report",
};

export default function NewViolationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Report New Violation
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill out the form below to submit a new violation report.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          }
        >
          <NewViolationClient />
        </Suspense>
      </div>
    </div>
  );
}
