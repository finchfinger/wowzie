"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const TABS = [
  { id: "overview", label: "Overview",  href: "/admin/overview" },
  { id: "camps",    label: "Camps",     href: "/admin/camps" },
  { id: "hosts",    label: "Hosts",     href: "/admin/hosts" },
  { id: "bookings", label: "Bookings",  href: "/admin/bookings" },
  { id: "feedback", label: "Feedback",  href: "/admin/feedback" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) { setIsAdmin(false); return; }
      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { admin: boolean };
      setIsAdmin(json.admin === true);
    });
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-72px)]">
        <p className="text-sm text-muted-foreground animate-pulse">Checking access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-72px)]">
        <div className="text-center space-y-2">
          <span className="material-symbols-rounded text-4xl text-destructive block">lock</span>
          <p className="text-sm font-medium text-foreground">Access denied</p>
          <p className="text-xs text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const activeId = TABS.find((t) => pathname.startsWith(t.href))?.id ?? "overview";

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="page-container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-primary" style={{ fontSize: 20 }}>admin_panel_settings</span>
              <span className="text-sm font-semibold text-foreground">Wowzi Admin</span>
            </div>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to site
            </Link>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeId === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-8">
        {children}
      </div>
    </div>
  );
}
