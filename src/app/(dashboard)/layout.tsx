"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="bg-bg-card border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="text-xl font-bold text-accent">
          ShootPlaner
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
            },
          }}
        />
      </nav>
      <main>{children}</main>
    </div>
  );
}
