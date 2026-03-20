import { Metadata } from "next";
import NewViolationClient from "./NewViolationClient";

export const metadata: Metadata = {
  title: "Report New Violation",
  description: "Submit a new violation report",
};

export default function NewViolationPage() {
  return <NewViolationClient />;
}
