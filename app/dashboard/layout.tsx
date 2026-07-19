import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardProvider } from "./_components/DashboardProvider";

const navItems = [
  { href: "/dashboard/stream", label: "Live Stream" },
  { href: "/dashboard/members", label: "Members" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <main className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Full-stack Next.js</p>
            <h1>Member Recognition Dashboard</h1>
            <p className="dashboard-subtitle">
              Separate routes for streaming and member management, with backend APIs inside app/api.
            </p>
          </div>

          <nav className="dashboard-nav" aria-label="Dashboard sections">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="dashboard-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}
      </main>
    </DashboardProvider>
  );
}