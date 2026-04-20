"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { NavTabs } from "@/components/ui/nav-tabs";

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
        <div className="page-container py-6 sm:py-8 pb-0">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-primary select-none" style={{ fontSize: 22 }}>admin_panel_settings</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">Wowzi Admin</h1>
                <p className="text-sm text-muted-foreground">Platform management</p>
              </div>
            </div>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
              ← Back to site
            </Link>
          </header>
          <NavTabs tabs={TABS} activeId={activeId} borderless />
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-8">
        {children}
      </div>
    </div>
  );
}
