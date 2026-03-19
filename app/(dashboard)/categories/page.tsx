import { Metadata } from "next";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Violation Categories | Dashboard",
  description: "Manage violation categories for your organization",
};

export default function CategoriesPage() {
  return <CategoriesClient />;
}
