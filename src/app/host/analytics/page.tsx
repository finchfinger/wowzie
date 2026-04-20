"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type BookingRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  platform_fee_percent: number | null;
  guests_count: number | null;
  contact_email: string | null;
  camps: { name: string; host_id: string } | null;
};

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card bg-card px-5 py-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function HostAnalyticsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at, total_cents, platform_fee_percent, guests_count, contact_email, camps:camp_id(name, host_id)")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });
      const mine = ((data || []) as unknown as BookingRow[]).filter(
        (b) => b.camps?.host_id === user.id
      );
      setBookings(mine);
      setLoading(false);
    };
    void load();
  }, [user]);

  const analytics = useMemo(() => {
    if (!bookings.length) return null;

    const totalRevenue = bookings.reduce((s, b) => s + (b.total_cents ?? 0), 0);

    // Per-email aggregation
    const emailMap: Record<string, { bookings: number; revenue: number }> = {};
    for (const b of bookings) {
      const e = b.contact_email ?? "";
      if (!emailMap[e]) emailMap[e] = { bookings: 0, revenue: 0 };
      emailMap[e].bookings++;
      emailMap[e].revenue += b.total_cents ?? 0;
    }
    const uniqueFamilies = Object.keys(emailMap).filter(Boolean).length;
    const repeats = Object.values(emailMap).filter((v) => v.bookings > 1).length;
    const repeatRate = uniqueFamilies > 0 ? Math.round((repeats / uniqueFamilies) * 100) : 0;

    // Per-camp aggregation
    const campMap: Record<string, { name: string; bookings: number; revenue: number; emails: Set<string> }> = {};
    for (const b of bookings) {
      const name = b.camps?.name ?? "Unknown";
      if (!campMap[name]) campMap[name] = { name, bookings: 0, revenue: 0, emails: new Set() };
      campMap[name].bookings++;
      campMap[name].revenue += b.total_cents ?? 0;
      if (b.contact_email) campMap[name].emails.add(b.contact_email);
    }
    const byCamp = Object.values(campMap).sort((a, b) => b.revenue - a.revenue);

    // Top guests
    const topGuests = Object.entries(emailMap)
      .filter(([e]) => !!e)
      .map(([email, v]) => {
        const last = bookings.find((b) => b.contact_email === email);
        return { email, ...v, lastBooked: last?.created_at ?? "" };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { totalRevenue, uniqueFamilies, repeatRate, byCamp, topGuests };
  }, [bookings]);

  const hasEnoughData = bookings.length >= 3;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-card bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-card bg-muted animate-pulse" />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="rounded-card bg-card px-6 py-14 text-center space-y-2">
        <span className="material-symbols-rounded text-4xl text-muted-foreground select-none">bar_chart</span>
        <p className="text-sm font-medium text-foreground">No data yet</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Your insights will appear here as bookings come in. Share your listings to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total bookings" value={String(bookings.length)} />
        <StatCard label="Total revenue" value={analytics ? fmt(analytics.totalRevenue) : "—"} />
        <StatCard label="Unique families" value={analytics ? String(analytics.uniqueFamilies) : "—"} />
        <StatCard
          label="Repeat rate"
          value={!hasEnoughData ? "—" : analytics ? `${analytics.repeatRate}%` : "—"}
          sub={!hasEnoughData ? "Available after 3 bookings" : undefined}
        />
      </div>

      {/* By camp */}
      {analytics && analytics.byCamp.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">By listing</h2>
          <div className="rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Camp</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Bookings</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Families</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.byCamp.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground truncate max-w-[200px]">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right">{c.bookings}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden sm:table-cell">{c.emails.size}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{fmt(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top guests */}
      {analytics && analytics.topGuests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top guests</h2>
            <Link href="/host/guests" className="text-xs text-primary hover:underline underline-offset-2">
              View all →
            </Link>
          </div>
          <div className="rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Family</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Bookings</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Last booked</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Total spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.topGuests.map((g, i) => (
                  <tr key={g.email} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="material-symbols-rounded text-amber-500 select-none shrink-0" style={{ fontSize: 16 }}>star</span>
                        )}
                        <span className="text-sm text-foreground truncate max-w-[180px]">{g.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden sm:table-cell">{g.bookings}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden sm:table-cell whitespace-nowrap">
                      {g.lastBooked ? fmtDate(g.lastBooked) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{fmt(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
