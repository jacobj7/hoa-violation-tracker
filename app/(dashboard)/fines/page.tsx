import { Suspense } from "react";
import FinesClient from "./FinesClient";

export const metadata = {
  title: "Fines Ledger",
  description: "View and manage fines",
};

export default function FinesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Fines Ledger</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all fines records
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <FinesClient />
      </Suspense>
    </div>
  );
}
