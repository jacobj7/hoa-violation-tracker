import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ViolationsClient from "./ViolationsClient";

export const metadata = {
  title: "Violations | Dashboard",
  description: "View and manage violations",
};

export default async function ViolationsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const status = searchParams?.status || "all";
  const page = parseInt(searchParams?.page || "1", 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and review all violations
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        }
      >
        <ViolationsClient
          initialStatus={status}
          initialPage={page}
          userId={session.user?.id as string}
        />
      </Suspense>
    </div>
  );
}
