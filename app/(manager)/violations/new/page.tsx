import { Metadata } from "next";
import NewViolationForm from "./NewViolationForm";

export const metadata: Metadata = {
  title: "New Violation | Manager Portal",
  description: "Create a new violation report",
};

export default function NewViolationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Violation</h1>
        <p className="text-gray-600 mt-1">
          Fill out the form below to create a new violation report.
        </p>
      </div>
      <NewViolationForm />
    </div>
  );
}
