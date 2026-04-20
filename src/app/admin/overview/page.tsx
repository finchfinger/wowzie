"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BlockSkeletons } from "@/components/ui/skeleton";
import Link from "next/link";

type Stats = {
  totalCamps: number;
  publishedCamps: number;
  totalHosts: number;
  pendingHosts: number;
  totalBookings: number;
  confirmedBookings: number;
  grossRevenue: number;
  netRevenue: number;
  totalFeedback: number;
  waitlisted: number;
};

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type StatItem = { label: string; value: number | string; href?: string; alert?: boolean; highlight?: boolean };

function StatCard({ label, value, href, alert, highlight }: StatItem) {
  const inner = (
    <div className={`rounded-xl border px-4 py-4 space-y-1 transition-colors ${
      href ? "hover:border-primary/30 cursor-pointer" : ""
    } ${alert ? "border-amber-300 bg-amber-50" : "border-border bg-background"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${highlight ? "text-primary" : alert ? "text-amber-700" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalCamps },
        { count: publishedCamps },
        { count: totalHosts },
        { count: pendingHosts },
        { count: totalBookings },
        { count: confirmedBookings },
        { data: bookingRevenue },
        { count: totalFeedback },
        { count: waitlisted },
      ] = await Promise.all([
        supabase.from("camps").select("*", { count: "exact", head: true }),
        supabase.from("camps").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("host_profiles").select("*", { count: "exact", head: true }),
        supabase.from("host_profiles").select("*", { count: "exact", head: true }).eq("host_status", "pending"),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("bookings").select("total_cents, platform_fee_percent").eq("status", "confirmed"),
        supabase.from("feedback").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "waitlisted"),
      ]);

      const gross = (bookingRevenue ?? []).reduce((sum, b) => sum + (b.total_cents ?? 0), 0);
      const fees = (bookingRevenue ?? []).reduce((sum, b) => {
        const rate = (b.platform_fee_percent ?? 10) / 100;
        return sum + Math.round((b.total_cents ?? 0) * rate);
      }, 0);

      setStats({
        totalCamps: totalCamps ?? 0,
        publishedCamps: publishedCamps ?? 0,
        totalHosts: totalHosts ?? 0,
        pendingHosts: pendingHosts ?? 0,
        totalBookings: totalBookings ?? 0,
        confirmedBookings: confirmedBookings ?? 0,
        grossRevenue: gross,
        netRevenue: fees,
        totalFeedback: totalFeedback ?? 0,
        waitlisted: waitlisted ?? 0,
      });
      setLoading(false);
    };
    void load();
  }, []);

  const statCards: { section: string; items: StatItem[] }[] = stats ? [
    {
      section: "Listings",
      items: [
        { label: "Total camps", value: stats.totalCamps, href: "/admin/camps" },
        { label: "Published", value: stats.publishedCamps, href: "/admin/camps" },
      ],
    },
    {
      section: "Hosts",
      items: [
        { label: "Total hosts", value: stats.totalHosts, href: "/admin/hosts" },
        { label: "Pending review", value: stats.pendingHosts, href: "/admin/hosts", alert: stats.pendingHosts > 0 },
      ],
    },
    {
      section: "Bookings",
      items: [
        { label: "Confirmed", value: stats.confirmedBookings, href: "/admin/bookings" },
        { label: "Waitlisted", value: stats.waitlisted, href: "/admin/bookings" },
      ],
    },
    {
      section: "Revenue",
      items: [
        { label: "Gross bookings", value: fmt(stats.grossRevenue) },
        { label: "Wowzi fees earned", value: fmt(stats.netRevenue), highlight: true },
      ],
    },
    {
      section: "Feedback",
      items: [
        { label: "Responses received", value: stats.totalFeedback, href: "/admin/feedback" },
      ],
    },
  ] : [];

  return loading ? (
    <BlockSkeletons count={4} height="h-20" />
  ) : (
    <div className="space-y-6">
      {statCards.map(({ section, items }) => (
        <div key={section}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item) => <StatCard key={item.label} {...item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
