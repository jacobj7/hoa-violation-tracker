import { Suspense } from "react";
import PropertiesClient from "./PropertiesClient";

export const metadata = {
  title: "Properties | Dashboard",
  description: "Manage your properties",
};

export default function PropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          Loading properties...
        </div>
      }
    >
      <PropertiesClient />
    </Suspense>
  );
}
