"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockSkeletons } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

type BookingRow = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number | null;
  platform_fee_percent: number | null;
  guests_count: number | null;
  contact_email: string | null;
  camps: { name: string; slug: string } | null;
};

type Filter = "all" | "confirmed" | "pending" | "waitlisted" | "cancelled";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
        .select("id, created_at, status, total_cents, platform_fee_percent, guests_count, contact_email, camps:camp_id(name, slug, short_id, short_id)")
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

  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const totalGross = confirmedBookings.reduce((sum, b) => sum + (b.total_cents ?? 0), 0);
  const totalFees = confirmedBookings.reduce((sum, b) => sum + Math.round((b.total_cents ?? 0) * ((b.platform_fee_percent ?? 10) / 100)), 0);

  const statusVariant = (s: string) => {
    if (s === "confirmed") return "confirmed" as const;
    if (s === "pending") return "pending" as const;
    if (s === "cancelled") return "cancelled" as const;
    if (s === "refunded") return "refunded" as const;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {confirmedBookings.length} confirmed · Gross {fmt(totalGross)} · Fees {fmt(totalFees)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or camp…"
            className="h-8 w-52 text-sm"
          />
          <div className="flex items-center gap-1">
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
      </div>

      {loading ? (
        <BlockSkeletons count={6} height="h-12" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="confirmation_number" title="No bookings found" description="Try adjusting your search or filter." />
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
                const variant = statusVariant(b.status);
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
                      {variant ? (
                        <StatusBadge variant={variant} />
                      ) : (
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-violet-100 text-violet-700">
                          {b.status}
                        </span>
                      )}
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
