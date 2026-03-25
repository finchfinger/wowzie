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
      return (
        <main className="flex-1">
          <HostGatewayPage />
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
              Host Basecamp
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

/* ─────────────────────────────────────────────────────────────
   HOST GATEWAY PAGE
   ───────────────────────────────────────────────────────────── */

const FAQ_SECTIONS = [
  {
    title: "Top questions",
    items: [
      {
        q: "Is my program a fit for hosting?",
        a: "Probably, yes. Families come to our platform for all kinds of kids activities, from one-time workshops to weeklong camps, seasonal programs, tutoring, sports, art, music, STEM, and more. If your offering is thoughtful, well-run, and designed for kids, there's a good chance it belongs here.",
      },
      {
        q: "How do I create a listing?",
        a: "Creating a listing is straightforward. Add your title, description, photos, age range, schedule, pricing, location, and any important details families should know. Once everything looks good, submit it for review and publish when you're ready.",
      },
      {
        q: "Do I have to host all the time?",
        a: "No. You control your own schedule and availability. You can host year-round, seasonally, once a week, during school breaks, or only on select dates.",
      },
      {
        q: "What are the fees?",
        a: "It's free to create a listing. When you receive a booking, we deduct a 10% platform fee plus standard payment processing fees. You'll always be able to see how payouts are calculated.",
      },
    ],
  },
  {
    title: "Hosting basics",
    items: [
      {
        q: "What kinds of camps and classes can I list?",
        a: "You can list a wide range of kids programs, including camps, classes, workshops, lessons, enrichment programs, tutoring, sports, creative activities, and school-break offerings. All listings must meet our platform standards for quality, clarity, and age-appropriateness.",
      },
      {
        q: "What should I include in my listing?",
        a: "The best listings are clear, specific, and welcoming. Include a strong description, quality photos, the age range, dates and times, pricing, location, what's included, what families should bring, and anything parents should know before booking.",
      },
      {
        q: "How do families book?",
        a: "Families can browse your listing, review the details, choose an available date or session, and book directly through the platform. Once booked, they'll receive a confirmation and any follow-up details you've included.",
      },
      {
        q: "Can I host as an individual or an organization?",
        a: "Yes. You can host as an individual instructor, educator, coach, artist, or tutor. You can also host as a studio, school, camp provider, nonprofit, or other organization.",
      },
    ],
  },
  {
    title: "Payments & fees",
    items: [
      {
        q: "How much does it cost to list?",
        a: "There's no upfront cost to create and publish a listing. Fees apply only when you receive a booking.",
      },
      {
        q: "When do I get paid?",
        a: "Payouts are sent according to our payment schedule after a booking is confirmed. Exact timing may vary based on payment processing and your payout setup, but we aim to keep payouts predictable and easy to track.",
      },
      {
        q: "How are payouts calculated?",
        a: "Your payout is based on the total amount paid by the family, minus the 10% platform fee and standard payment processing fees. For example, if a family pays $400, the platform fee would be $40, payment processing might be $12, and your payout would be $348.",
      },
      {
        q: "What happens if there's a refund or cancellation?",
        a: "If a booking is canceled or refunded, payout amounts may be adjusted based on the cancellation policy tied to that booking. We'll show the details clearly so you understand what was refunded and how it affects your earnings.",
      },
    ],
  },
  {
    title: "Safety & requirements",
    items: [
      {
        q: "Are there requirements to host?",
        a: "Yes. Hosts are expected to provide accurate listing information, clear communication, and a safe, age-appropriate experience for children and families. Depending on the type of program, additional requirements may apply.",
      },
      {
        q: "Do I need insurance, licenses, or waivers?",
        a: "That depends on the type of activity you offer and where you operate. Some hosts may need business licenses, permits, insurance, or signed waivers. It's your responsibility to make sure your program meets any local rules and professional requirements.",
      },
      {
        q: "How do you help create a safe experience for families?",
        a: "We help by setting clear expectations for listings, communication, and booking details. We also encourage hosts to provide complete information, clear policies, and thoughtful preparation so families know what to expect before they book.",
      },
    ],
  },
  {
    title: "Teams & organizations",
    items: [
      {
        q: "Can I add instructors or staff?",
        a: "Yes. If your program is run by more than one person, you can represent your broader team in your listing and account details so families understand who is leading the experience.",
      },
      {
        q: "Can I manage multiple programs or locations?",
        a: "Yes. Hosts with more than one offering can create and manage multiple listings, whether that means different classes, different age groups, or different locations.",
      },
      {
        q: "Can more than one person access the account?",
        a: "For teams and organizations, shared access may be available depending on how your host tools are set up. This makes it easier to manage bookings, schedules, and communication across your organization.",
      },
    ],
  },
];

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function HostGatewayPage() {
  const [openSections, setOpenSections] = useState<string[]>(["Top questions"]);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
    setOpenFaqId(null);
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          {/* Text */}
          <div className="flex-1 space-y-6 lg:max-w-[540px]">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Hosting on Wowzi
            </p>
            <h1 className="text-4xl sm:text-5xl xl:text-[56px] font-semibold leading-[1.1] tracking-tight text-foreground">
              Make some unforgettable experiences
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Share your camp, class, or workshop with more families — and manage schedules, registrations, and communication all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/host/apply"
                className="inline-flex items-center justify-center rounded-xl bg-foreground px-7 py-3.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
              >
                Start hosting
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-input bg-transparent px-7 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Ask a question
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="mt-10 lg:mt-0 shrink-0 lg:flex-1">
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=900&q=80&auto=format&fit=crop"
                alt="Kids at camp"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-10">
            Everything you need to show your program clearly and run it smoothly
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
            {[
              {
                tag: "Get discovered",
                title: "Show up where families are looking",
                desc: "Be easier to find by age, interest, and neighborhood — not buried in social posts or scattered flyers.",
              },
              {
                tag: "Look polished",
                title: "Make a strong first impression",
                desc: "Create a clear, beautiful listing with photos, schedules, pricing, and details families can actually understand.",
              },
              {
                tag: "Stay organized",
                title: "Keep the moving parts in one place",
                desc: "Listings, registrations, rosters, communication, and session details — all in one connected system so you can focus more on the experience you're actually running.",
              },
            ].map((v) => (
              <div key={v.tag}>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                  {v.tag}
                </p>
                <h3 className="text-base font-semibold text-foreground mb-2 leading-snug">
                  {v.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
              Start hosting in three simple steps
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up your listing, add your schedule, and start welcoming families.
            </p>
          </div>
          <Link
            href="/contact"
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors shrink-0"
          >
            Ask a question
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          {[
            {
              n: "1",
              title: "Create your listing",
              desc: "Add your description, photos, ages, pricing, location, and policies so families know exactly what you offer.",
            },
            {
              n: "2",
              title: "Set your schedule",
              desc: "Offer one-time workshops, recurring classes, school-break sessions, or full camp weeks with a setup that fits your program.",
            },
            {
              n: "3",
              title: "Welcome families",
              desc: "Accept registrations, keep details organized, and stay in touch without juggling forms, spreadsheets, and email chains.",
            },
          ].map((step) => (
            <div key={step.n} className="flex gap-5 items-start">
              <span className="text-5xl font-semibold text-border leading-none shrink-0 mt-1">
                {step.n}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who hosts ── */}
      <section className="border-y border-border bg-muted/20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              Who hosts on Wowzi
            </h2>
            <p className="text-sm text-muted-foreground">
              Any thoughtful, well-run program designed for kids belongs here.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Individual instructors",
                desc: "Tutors, coaches, artists, and educators running their own programs",
              },
              {
                label: "Camp providers",
                desc: "Day camps, overnight camps, themed programs, and seasonal offerings",
              },
              {
                label: "Schools & studios",
                desc: "Enrichment centers, dance studios, makerspaces, and learning hubs",
              },
              {
                label: "Nonprofits & orgs",
                desc: "Community organizations, youth programs, and after-school providers",
              },
            ].map((who) => (
              <div
                key={who.label}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <p className="text-sm font-semibold text-foreground mb-1.5">{who.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{who.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-16">
          {/* Pricing details */}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Payments & fees
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
              Straightforward pricing
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Listing on Wowzi is free. We charge a 10% platform fee plus standard payment
              processing fees only when you receive a booking. No monthly fees, no surprises.
            </p>

            {/* Example payout table */}
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 bg-muted/50 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Example payout
                </p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Family pays", value: "$400.00" },
                  { label: "Platform fee (10%)", value: "−$40.00" },
                  { label: "Payment processing (~3%)", value: "−$12.00" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-5 py-3.5">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-4 bg-muted/30">
                  <span className="text-sm font-semibold text-foreground">Your payout</span>
                  <span className="text-sm font-semibold text-foreground">$348.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA card */}
          <div className="flex-1 lg:max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to get started?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  It only takes a few minutes to set up your listing. Apply as a host and
                  we&apos;ll review your program within a few days.
                </p>
              </div>
              <Link
                href="/host/apply"
                className="inline-flex items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors w-full"
              >
                Apply to host
              </Link>
              <p className="text-xs text-center text-muted-foreground">
                Questions?{" "}
                <Link
                  href="/contact"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Get in touch
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-border">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-10">
            Your questions, answered
          </h2>

          <div className="max-w-2xl space-y-3">
            {FAQ_SECTIONS.map((section) => {
              const sectionOpen = openSections.includes(section.title);
              return (
                <div
                  key={section.title}
                  className="rounded-2xl border border-border overflow-hidden"
                >
                  {/* Section toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {section.title}
                    </span>
                    <ChevronDown open={sectionOpen} />
                  </button>

                  {/* Section items */}
                  {sectionOpen && (
                    <div className="border-t border-border divide-y divide-border/60">
                      {section.items.map((item, qi) => {
                        const id = `${section.title}-${qi}`;
                        const itemOpen = openFaqId === id;
                        return (
                          <div key={qi}>
                            <button
                              type="button"
                              onClick={() => toggleFaq(id)}
                              className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors gap-4"
                            >
                              <span className="text-sm text-foreground">{item.q}</span>
                              <ChevronDown open={itemOpen} />
                            </button>
                            {itemOpen && (
                              <div className="px-5 pb-5">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {item.a}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border bg-foreground">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-background mb-2">
              Ready to share your program?
            </h2>
            <p className="text-sm text-background/60">
              Join the hosts already reaching families on Wowzi.
            </p>
          </div>
          <Link
            href="/host/apply"
            className="inline-flex items-center justify-center shrink-0 rounded-xl bg-background px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-background/90 transition-colors"
          >
            Start hosting
          </Link>
        </div>
      </section>
    </div>
  );
}
