"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const FEE_RATE = 0.05;

type BookingRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  guests_count: number | null;
  camps: { name: string; host_id: string } | null;
};

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function HostFinancialsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at, total_cents, guests_count, camps:camp_id(name, host_id)")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(100);

      // Filter to only bookings for this host's camps
      const mine = ((data || []) as unknown as BookingRow[]).filter(
        (b) => b.camps?.host_id === user.id
      );
      setBookings(mine);
      setLoading(false);
    };
    void load();
  }, [user]);

  const totalGross = bookings.reduce((sum, b) => sum + (b.total_cents || 0), 0);
  const totalFee = Math.round(totalGross * FEE_RATE);
  const totalNet = totalGross - totalFee;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Gross earned", value: loading ? "—" : fmt(totalGross) },
          { label: "Golly fee (5%)", value: loading ? "—" : fmt(totalFee), muted: true },
          { label: "Net payout", value: loading ? "—" : fmt(totalNet), highlight: true },
        ].map(({ label, value, muted, highlight }) => (
          <div key={label} className="rounded-2xl bg-card px-5 py-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold ${highlight ? "text-emerald-600" : muted ? "text-muted-foreground" : "text-foreground"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Payout history */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Payout history</h2>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No confirmed bookings yet. Payouts will appear here once families book your activities.
          </p>
        )}

        {!loading && bookings.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Activity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Guests</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Gross</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Fee</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Net</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const gross = b.total_cents || 0;
                  const fee = Math.round(gross * FEE_RATE);
                  const net = gross - fee;
                  return (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground truncate max-w-[160px]">
                        {b.camps?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {fmtDate(b.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden sm:table-cell">
                        {b.guests_count ?? 1}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap">
                        {fmt(gross)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap hidden sm:table-cell">
                        −{fmt(fee)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground text-right whitespace-nowrap">
                        {fmt(net)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Paid
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

      {/* Stripe connect */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Payments</h2>
        <p className="text-xs text-muted-foreground max-w-xl mb-3">
          Golly charges a 5% host fee on each booking, automatically deducted from your payout.
          This covers payment processing, customer support, and platform maintenance.
        </p>
        <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Stripe</p>
            <p className="text-xs text-muted-foreground">
              Connect your Stripe account to accept payments securely and get paid quickly.
            </p>
          </div>
          <Button size="sm">Get started</Button>
        </div>
      </div>
    </div>
  );
}
