import { Suspense } from "react";
import PropertiesClient from "./PropertiesClient";

export const metadata = {
  title: "Properties | Dashboard",
  description: "Manage your properties",
};

export default function PropertiesPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center">Loading properties...</div>}
    >
      <PropertiesClient />
    </Suspense>
  );
}
