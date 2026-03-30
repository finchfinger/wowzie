"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const PARENT_ARTICLES = [
  {
    icon: "book_online",
    title: "How booking works",
    desc: "Learn how to find, compare, and book camps or classes on Wowzi.",
    href: "/help/how-booking-works",
  },
  {
    icon: "money_off",
    title: "Cancellations and refunds",
    desc: "How to cancel or change a booking, and when you're eligible for a full or partial refund.",
    href: "/help/cancellations-refunds",
  },
  {
    icon: "manage_accounts",
    title: "Managing your kids' profiles",
    desc: "How to add your child's information once and use it across all future bookings.",
    href: "/help/managing-kid-profiles",
  },
  {
    icon: "chat",
    title: "Messaging hosts",
    desc: "How to contact a host before or after booking and when to expect replies.",
    href: "/help/messaging-hosts",
  },
];

const CAMP_ARTICLES = [
  {
    icon: "storefront",
    title: "Listing a camp or class",
    desc: "Step-by-step guide to creating a listing, adding photos, setting prices, and managing your schedule.",
    href: "/help/listing-camp-class",
  },
  {
    icon: "payments",
    title: "Payments and payouts",
    desc: "How you'll receive payments, payout timing, and what fees apply.",
    href: "/help/payments-payouts",
  },
  {
    icon: "rate_review",
    title: "Reviews and feedback",
    desc: "How reviews work, how to respond, and what keeps the community constructive.",
    href: "/help/reviews-feedback",
  },
  {
    icon: "verified_user",
    title: "Safety and verification",
    desc: "How Wowzie screens listings, verifies hosts, and supports safe experiences for kids and families.",
    href: "/help/safety-verification",
  },
];

export default function HelpPage() {
  return (
    <main>
      <div className="page-container py-10">
        <div className="page-grid">
          <div className="span-8-center">
            <PageHeader
              title="Help Center"
              subtitle="Find quick answers and tips to make your Wowzi experience easy, fun, and stress-free."
              action={{ label: "Contact us", href: "/contact" }}
            />

            <div className="space-y-10">
              {/* For Parents */}
              <section>
                <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground">For Parents</h2>
                <div className="grid gap-8 md:grid-cols-2">
                  {PARENT_ARTICLES.map((a) => (
                    <Link key={a.href} href={a.href} className="group flex gap-3">
                      <span className="material-symbols-rounded mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" style={{ fontSize: 22 }} aria-hidden="true">{a.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{a.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* For Camps */}
              <section>
                <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground">For Camps</h2>
                <div className="grid gap-8 md:grid-cols-2">
                  {CAMP_ARTICLES.map((a) => (
                    <Link key={a.href} href={a.href} className="group flex gap-3">
                      <span className="material-symbols-rounded mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" style={{ fontSize: 22 }} aria-hidden="true">{a.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{a.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
