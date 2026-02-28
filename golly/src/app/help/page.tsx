"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const PARENT_ARTICLES = [
  {
    emoji: "🎟️",
    title: "How booking works",
    desc: "Learn how to find, compare, and book camps or classes on Golly.",
    href: "/help/how-booking-works",
  },
  {
    emoji: "🙋🏽‍♀️",
    title: "Cancellations and refunds",
    desc: "How to cancel or change a booking, and when you're eligible for a full or partial refund.",
    href: "/help/cancellations-refunds",
  },
  {
    emoji: "🧠",
    title: "Managing your kids' profiles",
    desc: "How to add your child's information once and use it across all future bookings.",
    href: "/help/managing-kid-profiles",
  },
  {
    emoji: "💬",
    title: "Messaging hosts",
    desc: "How to contact a host before or after booking and when to expect replies.",
    href: "/help/messaging-hosts",
  },
];

const CAMP_ARTICLES = [
  {
    emoji: "🌱",
    title: "Listing a camp or class",
    desc: "Step-by-step guide to creating a listing, adding photos, setting prices, and managing your schedule.",
    href: "/help/listing-camp-class",
  },
  {
    emoji: "💳",
    title: "Payments and payouts",
    desc: "How you'll receive payments, payout timing, and what fees apply.",
    href: "/help/payments-payouts",
  },
  {
    emoji: "⭐",
    title: "Reviews and feedback",
    desc: "How reviews work, how to respond, and what keeps the community constructive.",
    href: "/help/reviews-feedback",
  },
  {
    emoji: "🛡️",
    title: "Safety and verification",
    desc: "How Golly screens listings, verifies hosts, and supports safe experiences for kids and families.",
    href: "/help/safety-verification",
  },
];

export default function HelpPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Help Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find quick answers and tips to make your Golly experience easy, fun, and stress-free.
          </p>
        </div>
        <Link href="/contact">
          <Button size="sm">Contact us</Button>
        </Link>
      </div>

      <div className="space-y-10">
        {/* For Parents */}
        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground">For Parents</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {PARENT_ARTICLES.map((a) => (
              <Link key={a.href} href={a.href} className="group flex gap-3">
                <div className="mt-1 text-xl" aria-hidden="true">{a.emoji}</div>
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
                <div className="mt-1 text-xl" aria-hidden="true">{a.emoji}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
