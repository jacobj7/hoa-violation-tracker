import { ReactNode } from "react";
import NavSidebar from "@/components/NavSidebar";
import SignOutButton from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <NavSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-end p-4 border-b bg-white">
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
