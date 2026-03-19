import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HOA Violation Manager",
  description: "Manage HOA violations efficiently and effectively",
  keywords: ["HOA", "violation", "management", "homeowners association"],
  authors: [{ name: "HOA Violation Manager" }],
  openGraph: {
    title: "HOA Violation Manager",
    description: "Manage HOA violations efficiently and effectively",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
