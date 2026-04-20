"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string | null;
  total_cents: number | null;
  platform_fee_percent: number | null;
  guests_count: number | null;
  contact_email: string | null;
  camps: { name: string; slug: string } | null;
};

type Filter = "all" | "confirmed" | "pending" | "waitlisted" | "cancelled";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (cents: number) =>
  `$${(cents / 100).toFixed(2)}`;

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100 text-amber-700",
  waitlisted:"bg-violet-100 text-violet-700",
  cancelled: "bg-muted text-muted-foreground",
  refunded:  "bg-destructive/10 text-destructive",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at, status, payment_status, total_cents, platform_fee_percent, guests_count, contact_email, camps:camp_id(name, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      setBookings((data ?? []) as unknown as BookingRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = bookings
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => !search ||
      b.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      (b.camps?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const totalGross = filtered
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + (b.total_cents ?? 0), 0);
  const totalFees = filtered
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + Math.round((b.total_cents ?? 0) * ((b.platform_fee_percent ?? 10) / 100)), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bookings.filter(b => b.status === "confirmed").length} confirmed ·{" "}
            Gross {fmt(totalGross)} · Fees {fmt(totalFees)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or camp…"
            className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 w-52"
          />
          {(["all", "confirmed", "pending", "waitlisted", "cancelled"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-background border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No bookings found.
        </div>
      ) : (
        <div className="rounded-xl bg-background border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Camp</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Parent</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Gross</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Fee</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => {
                const fee = Math.round((b.total_cents ?? 0) * ((b.platform_fee_percent ?? 10) / 100));
                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-[180px]">{b.camps?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[180px]">
                      {b.contact_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {fmtDate(b.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground text-right hidden sm:table-cell whitespace-nowrap">
                      {b.total_cents ? fmt(b.total_cents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden sm:table-cell whitespace-nowrap">
                      {b.status === "confirmed" ? fmt(fee) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[b.status] ?? "bg-muted text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
