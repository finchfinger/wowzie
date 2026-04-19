"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

type BookingRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  guests_count: number | null;
  platform_fee_percent: number | null;
  camps: { name: string; host_id: string } | null;
};

type ConnectStatus =
  | "loading"
  | "not_configured"
  | "not_connected"
  | "pending"
  | "connected";

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function HostFinancialsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>("loading");
  const [connectLoading, setConnectLoading] = useState(false);

  // Load bookings
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at, total_cents, guests_count, platform_fee_percent, camps:camp_id(name, host_id)")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(100);

      const mine = ((data || []) as unknown as BookingRow[]).filter(
        (b) => b.camps?.host_id === user.id
      );
      setBookings(mine);
      setLoading(false);
    };
    void load();
  }, [user]);

  // Load Stripe Connect status
  useEffect(() => {
    if (!user) return;
    const fetchStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/stripe/connect/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json() as { status: ConnectStatus };
        setConnectStatus(json.status);
      }
    };
    void fetchStatus();
  }, [user]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const connected = searchParams.get("connected");
    const refresh = searchParams.get("refresh");
    if (connected === "true" || refresh === "true") {
      // Re-fetch status after returning from Stripe
      setConnectStatus("loading");
      const refetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/stripe/connect/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json() as { status: ConnectStatus };
          setConnectStatus(json.status);
        }
        // Clean up URL params
        router.replace("/host/financials");
      };
      void refetch();
    }
  }, [searchParams, router]);

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/stripe/connect/onboard", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json() as { url: string };
      window.location.href = json.url;
    } else {
      setConnectLoading(false);
    }
  };

  const totalGross = bookings.reduce((sum, b) => sum + (b.total_cents || 0), 0);
  const totalFee = bookings.reduce((sum, b) => {
    const rate = (b.platform_fee_percent ?? 10) / 100;
    return sum + Math.round((b.total_cents || 0) * rate);
  }, 0);
  const totalNet = totalGross - totalFee;

  /* ── Not connected — show setup prompt ── */
  if (connectStatus === "not_connected" || connectStatus === "not_configured") {
    return (
      <div className="space-y-6">
        <EmptyState
          icon="payments"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
          title="Connect your payout account"
          description="Before you can receive payments from bookings, you need to connect your bank account through Stripe. This is quick, secure, and only takes a few minutes."
          action={{
            label: connectLoading ? "Redirecting…" : "Connect to Stripe",
            onClick: handleConnectStripe,
          }}
        />

        {/* Fee breakdown explainer */}
        <div className="mx-auto max-w-sm rounded-card bg-card p-5 space-y-0">
          <p className="text-sm font-semibold text-foreground mb-3">
            Here&apos;s an example of how payments work
          </p>
          {[
            { label: "Family pays", value: "$400", bold: false },
            { label: "Platform fee (10%)", value: "−$40", muted: true },
            { label: "Payment processing (3%)", value: "−$12", muted: true },
            { label: "You receive", value: "$348", bold: true },
          ].map(({ label, value, muted, bold }, i, arr) => (
            <div
              key={label}
              className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? "border-b border-border/60" : ""}`}
            >
              <span className={`text-sm ${muted ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
              <span className={`text-sm ${bold ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Gross earned", value: loading ? "—" : fmt(totalGross) },
          { label: "Wowzi fee", value: loading ? "—" : fmt(totalFee), muted: true },
          { label: "Net payout", value: loading ? "—" : fmt(totalNet), highlight: true },
        ].map(({ label, value, muted, highlight }) => (
          <div key={label} className="rounded-card bg-card px-5 py-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold ${highlight ? "text-primary" : muted ? "text-muted-foreground" : "text-foreground"}`}>
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
          <EmptyState
            icon="payments"
            title="No payouts yet"
            description="Payouts will appear here once families book your activities."
            className="py-10"
          />
        )}

        {!loading && bookings.length > 0 && (
          <div className="rounded-card overflow-hidden">
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
                  const feeRate = (b.platform_fee_percent ?? 10) / 100;
                  const fee = Math.round(gross * feeRate);
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
                        <span
                          className="material-symbols-rounded select-none text-[20px] text-emerald-600"
                          title="Paid"
                          aria-label="Paid"
                        >
                          paid
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

      {/* Stripe Connect */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Payments</h2>
        <p className="text-xs text-muted-foreground max-w-xl mb-3">
          Wowzi charges a 10% host fee on each booking (15% for boosted listings), automatically deducted from your payout.
          This covers payment processing, customer support, and platform maintenance.
        </p>

        <div className="flex items-center justify-between rounded-card bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Stripe</p>
            {connectStatus === "connected" && (
              <p className="text-xs text-emerald-600">Connected — payouts enabled</p>
            )}
            {connectStatus === "pending" && (
              <p className="text-xs text-amber-600">Finish setting up your account to receive payouts</p>
            )}
          </div>

          {connectStatus === "loading" && (
            <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
          )}
          {connectStatus === "connected" && (
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-foreground underline underline-offset-2"
            >
              Manage payouts →
            </a>
          )}
          {connectStatus === "pending" && (
            <Button size="sm" onClick={handleConnectStripe} disabled={connectLoading}>
              {connectLoading ? "Redirecting…" : "Finish setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
