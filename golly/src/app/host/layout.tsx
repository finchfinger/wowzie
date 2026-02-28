"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { NavTabs } from "@/components/ui/nav-tabs";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<HostStatus>("not_applied");

  const isAllowedPreApprovalPath = useMemo(() => {
    return (
      pathname === "/host" ||
      pathname === "/host/apply" ||
      pathname === "/host/reviewing"
    );
  }, [pathname]);

  const isHostActivitiesRoute = pathname.startsWith("/host/activities");

  // Check host status once when user is known — never re-runs on tab change
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    const checkHostStatus = async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("host_profiles")
        .select("user_id, host_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[HostLayout] error loading host profile:", error);
        setStatus("not_applied");
        setChecking(false);
        return;
      }

      const nextStatus =
        (data?.host_status as HostStatus | null) || "not_applied";
      setStatus(nextStatus);
      setChecking(false);
    };

    void checkHostStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Handle redirects when pathname or status changes — no loading flash
  useEffect(() => {
    if (checking || authLoading) return;
    if (!user) return;

    if (status !== "approved" && !isAllowedPreApprovalPath) {
      router.replace("/host");
      return;
    }
    if (status === "approved" && pathname === "/host") {
      router.replace("/host/listings");
      return;
    }
    if (
      status === "approved" &&
      (pathname === "/host/apply" || pathname === "/host/reviewing")
    ) {
      router.replace("/host/listings");
    }
  }, [status, checking, pathname, isAllowedPreApprovalPath, authLoading, user, router]);

  if (authLoading || checking) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
      </main>
    );
  }

  /* ── Pre-approval: gate page ── */
  if (status !== "approved") {
    if (pathname === "/host") {
      const steps = [
        {
          title: "Create your listing",
          desc: "Add photos, set your price, choose your age group.",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
              <path d="M756-120 537-339l84-84 219 219-84 84Zm-552 0-84-84 276-276-68-68-28 28-51-51v82h-60v-136l-86-86 42-42 86 86h136v60l-82 0 51 51 28-28 175 175-51 51-100-100-264 264Z" />
            </svg>
          ),
        },
        {
          title: "Pick your schedule",
          desc: "Choose how guests will book—daily, weekly, or seasonal.",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
              <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z" />
            </svg>
          ),
        },
        {
          title: "Make it stand out",
          desc: "Add some photos plus a title and a description\u2014we can help!",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
              <path d="m354-247 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-80l65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Zm247-350Z" />
            </svg>
          ),
        },
      ];

      return (
        <main className="flex-1">
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-10 sm:py-14">
            {/* Hero */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
                  Make some unforgettable experiences
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                  Explore popular activities near you, browse by category, or
                  check out some of the great community calendars.
                </p>
              </div>
              <Link
                href="/host/apply"
                className="inline-flex items-center justify-center shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Hero image */}
            <div className="rounded-2xl overflow-hidden bg-muted aspect-[16/7] sm:aspect-[16/6] mb-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=1200&q=80&auto=format&fit=crop"
                alt="Kids having fun at camp"
                className="h-full w-full object-cover"
              />
            </div>

            {/* How it works */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                  How it works
                </h2>
                <p className="text-sm text-muted-foreground">
                  It&apos;s easy to get started.
                </p>
              </div>
              <Link
                href="/contact"
                className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Ask a question
              </Link>
            </div>

            {/* Steps */}
            <div className="mt-8 space-y-6 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    {step.icon}
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-12">
              <Link
                href="/host/apply"
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    );
  }

  // Approved: activity routes get no dashboard chrome
  if (isHostActivitiesRoute) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    );
  }

  // Approved: dashboard with nav tabs
  const hostTabs = [
    { id: "listings", label: "Listings", href: "/host/listings" },
    { id: "contacts", label: "Contacts", href: "/host/contacts" },
    { id: "financials", label: "Financials", href: "/host/financials" },
    { id: "settings", label: "Settings", href: "/host/settings" },
  ];

  const activeTabId = hostTabs.find((t) => pathname.startsWith(t.href))?.id ?? "listings";

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-6 sm:py-8 pb-16">
        {/* Header row */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Host Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your activities, families, and payouts.
            </p>
          </div>
          <Link
            href="/host/activities/new"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            + Create listing
          </Link>
        </header>

        <NavTabs tabs={hostTabs} activeId={activeTabId} />

        <section>{children}</section>
      </div>
    </main>
  );
}
