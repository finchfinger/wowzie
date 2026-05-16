"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type BookingRow = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number | null;
  platform_fee_percent: number | null;
  guests_count: number | null;
  contact_email: string | null;
  camps: { name: string; host_id: string; capacity: number | null } | null;
};

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ── Export helpers ── */

type ExportFormat = "csv" | "xlsx" | "pdf";

function downloadCsv(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "");
        return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function downloadXlsx(sheets: { name: string; rows: Record<string, string | number>[] }[], filename: string) {
  const XLSX = (await import("xlsx")).default;
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

async function downloadPdf(
  sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
  filename: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(14);
  doc.text("Analytics Report", 14, y); y += 7;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 14, y);
  doc.setTextColor(0);
  y += 8;
  for (const { title, headers, rows } of sections) {
    doc.setFontSize(11);
    doc.text(title, 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 24, 27] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  doc.save(filename);
}

/* ── Export dropdown ── */

function ExportMenu({ onExport }: { onExport: (fmt: ExportFormat) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
      >
        <span className="material-symbols-outlined select-none" style={{ fontSize: 15 }}>download</span>
        Export
        <span className="material-symbols-outlined select-none" style={{ fontSize: 14 }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[120px]">
          {(["csv", "xlsx", "pdf"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => { onExport(f); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
            >
              <span className="material-symbols-outlined select-none text-muted-foreground" style={{ fontSize: 15 }}>
                {f === "pdf" ? "picture_as_pdf" : f === "xlsx" ? "table" : "csv"}
              </span>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stat card ── */

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "good" | "warn" | "neutral" }) {
  const valueColor =
    highlight === "good" ? "text-emerald-600" :
    highlight === "warn" ? "text-amber-500" :
    "text-foreground";
  return (
    <div className="rounded-card bg-card px-5 py-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── Page ── */

export default function HostAnalyticsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at, status, total_cents, platform_fee_percent, guests_count, contact_email, camps:camp_id(name, host_id, capacity)")
        .in("status", ["confirmed", "cancelled", "refunded"])
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      const mine = ((data || []) as unknown as BookingRow[]).filter(
        (b) => b.camps?.host_id === user.id
      );
      setBookings(mine);
      setLoading(false);
    };
    void load();
    return () => { isMounted = false; };
  }, [user]);

  const confirmed = useMemo(() => bookings.filter((b) => b.status === "confirmed"), [bookings]);
  const cancelled = useMemo(() => bookings.filter((b) => b.status === "cancelled" || b.status === "refunded"), [bookings]);

  const analytics = useMemo(() => {
    if (!confirmed.length) return null;

    const totalRevenue = confirmed.reduce((s, b) => s + (b.total_cents ?? 0), 0);
    const totalKids = confirmed.reduce((s, b) => s + (b.guests_count ?? 1), 0);

    // Per-email aggregation
    const emailMap: Record<string, { bookings: number; revenue: number; lastBooked: string }> = {};
    for (const b of confirmed) {
      const e = b.contact_email ?? "";
      if (!emailMap[e]) emailMap[e] = { bookings: 0, revenue: 0, lastBooked: "" };
      emailMap[e].bookings++;
      emailMap[e].revenue += b.total_cents ?? 0;
      if (!emailMap[e].lastBooked || b.created_at > emailMap[e].lastBooked)
        emailMap[e].lastBooked = b.created_at;
    }
    const uniqueFamilies = Object.keys(emailMap).filter(Boolean).length;
    const repeats = Object.values(emailMap).filter((v) => v.bookings > 1).length;
    const repeatRate = uniqueFamilies > 0 ? Math.round((repeats / uniqueFamilies) * 100) : 0;

    // Per-camp aggregation (include capacity)
    const campMap: Record<string, { name: string; bookings: number; revenue: number; kids: number; emails: Set<string>; capacity: number | null }> = {};
    for (const b of confirmed) {
      const name = b.camps?.name ?? "Unknown";
      if (!campMap[name]) campMap[name] = { name, bookings: 0, revenue: 0, kids: 0, emails: new Set(), capacity: b.camps?.capacity ?? null };
      campMap[name].bookings++;
      campMap[name].revenue += b.total_cents ?? 0;
      campMap[name].kids += b.guests_count ?? 1;
      if (b.contact_email) campMap[name].emails.add(b.contact_email);
    }
    const byCamp = Object.values(campMap).sort((a, b) => b.revenue - a.revenue);

    // Enrollment health
    const campsWithCap = byCamp.filter((c) => c.capacity && c.capacity > 0);
    const fillRates = campsWithCap.map((c) => c.kids / c.capacity!);
    const avgFillRate = fillRates.length ? Math.round((fillRates.reduce((s, r) => s + r, 0) / fillRates.length) * 100) : null;
    const soldOutCount = fillRates.filter((r) => r >= 1).length;
    const over80Count = fillRates.filter((r) => r >= 0.8).length;
    const openSpots = campsWithCap.reduce((s, c) => s + Math.max(0, c.capacity! - c.kids), 0);

    // Cancellation rate
    const totalAttempted = confirmed.length + cancelled.length;
    const cancellationRate = totalAttempted > 0 ? Math.round((cancelled.length / totalAttempted) * 100) : 0;

    // Revenue per child
    const revenuePerKid = totalKids > 0 ? Math.round(totalRevenue / totalKids) : 0;

    // Best month
    const byMonth: Record<string, number> = {};
    for (const b of confirmed) {
      const month = b.created_at.slice(0, 7); // "2026-01"
      byMonth[month] = (byMonth[month] ?? 0) + (b.total_cents ?? 0);
    }
    const bestMonth = Object.entries(byMonth).sort(([, a], [, b]) => b - a)[0];
    const bestMonthLabel = bestMonth
      ? new Date(bestMonth[0] + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : null;

    // New this month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const newThisMonth = confirmed.filter((b) => b.created_at.slice(0, 7) === thisMonth).length;

    // Top guests
    const topGuests = Object.entries(emailMap)
      .filter(([e]) => !!e)
      .map(([email, v]) => ({ email, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue, totalKids, uniqueFamilies, repeatRate, byCamp, topGuests, emailMap,
      avgFillRate, soldOutCount, over80Count, openSpots, cancellationRate, revenuePerKid,
      bestMonthLabel, newThisMonth, campsWithCap: campsWithCap.length, totalCamps: byCamp.length,
    };
  }, [confirmed, cancelled]);

  /* ── Export ── */
  const handleExport = async (format: ExportFormat) => {
    if (!analytics) return;

    const listingRows = analytics.byCamp.map((c) => ({
      "Listing": c.name,
      "Bookings": c.bookings,
      "Families": c.emails.size,
      "Kids Enrolled": c.kids,
      "Capacity": c.capacity ?? "—",
      "Fill Rate": c.capacity ? `${Math.round((c.kids / c.capacity) * 100)}%` : "—",
      "Revenue": `$${(c.revenue / 100).toFixed(2)}`,
    }));

    const guestRows = Object.entries(analytics.emailMap)
      .filter(([e]) => !!e)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([email, v]) => ({
        "Email": email,
        "Bookings": v.bookings,
        "Last Booked": v.lastBooked ? fmtDate(v.lastBooked) : "",
        "Total Spent": `$${(v.revenue / 100).toFixed(2)}`,
      }));

    const filename = `analytics-report`;

    if (format === "csv") {
      downloadCsv(listingRows, `${filename}-listings.csv`);
      setTimeout(() => downloadCsv(guestRows, `${filename}-guests.csv`), 300);
    } else if (format === "xlsx") {
      await downloadXlsx([
        { name: "By Listing", rows: listingRows },
        { name: "Guests", rows: guestRows },
      ], `${filename}.xlsx`);
    } else {
      await downloadPdf([
        {
          title: "By Listing",
          headers: ["Listing", "Bookings", "Families", "Kids", "Capacity", "Fill Rate", "Revenue"],
          rows: analytics.byCamp.map((c) => [
            c.name, c.bookings, c.emails.size, c.kids,
            c.capacity ?? "—",
            c.capacity ? `${Math.round((c.kids / c.capacity) * 100)}%` : "—",
            `$${(c.revenue / 100).toFixed(2)}`,
          ]),
        },
        {
          title: "Guests",
          headers: ["Email", "Bookings", "Last Booked", "Total Spent"],
          rows: guestRows.map((g) => [g["Email"], g["Bookings"], g["Last Booked"], g["Total Spent"]]),
        },
      ], `${filename}.pdf`);
    }
  };

  const hasEnoughData = confirmed.length >= 3;

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

  if (!confirmed.length) {
    return (
      <div className="rounded-card bg-card px-6 py-14 text-center space-y-2">
        <span className="material-symbols-outlined text-4xl text-muted-foreground select-none">bar_chart</span>
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overview</p>
          <ExportMenu onExport={handleExport} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total bookings" value={String(confirmed.length)} />
          <StatCard label="Total revenue" value={analytics ? fmt(analytics.totalRevenue) : "—"} />
          <StatCard label="Unique families" value={analytics ? String(analytics.uniqueFamilies) : "—"} />
          <StatCard
            label="Repeat rate"
            value={!hasEnoughData ? "—" : analytics ? `${analytics.repeatRate}%` : "—"}
            sub={!hasEnoughData ? "Available after 3 bookings" : undefined}
            highlight={analytics && analytics.repeatRate >= 30 ? "good" : undefined}
          />
        </div>
      </div>

      {/* Enrollment health */}
      {analytics && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enrollment health</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Kids enrolled"
              value={String(analytics.totalKids)}
              sub="across all listings"
            />
            {analytics.avgFillRate !== null && (
              <StatCard
                label="Avg fill rate"
                value={`${analytics.avgFillRate}%`}
                sub={`${analytics.campsWithCap} of ${analytics.totalCamps} camps`}
                highlight={analytics.avgFillRate >= 80 ? "good" : analytics.avgFillRate >= 50 ? "neutral" : "warn"}
              />
            )}
            <StatCard
              label="Sold out"
              value={`${analytics.soldOutCount} of ${analytics.campsWithCap || analytics.totalCamps}`}
              highlight={analytics.soldOutCount > 0 ? "good" : "neutral"}
            />
            <StatCard
              label="Revenue per child"
              value={fmt(analytics.revenuePerKid)}
            />
          </div>
        </div>
      )}


      {/* By camp */}
      {analytics && analytics.byCamp.length > 0 && (
        <Card className="py-0">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle>By listing</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-8 py-2.5 text-left text-xs font-medium text-muted-foreground">Camp</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground">Bookings</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Kids</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Fill rate</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {analytics.byCamp.map((c) => {
                  const fillRate = c.capacity ? Math.round((c.kids / c.capacity) * 100) : null;
                  return (
                    <tr key={c.name} className="hover:bg-muted/20 transition-colors">
                      <td className="px-8 py-3.5 text-sm font-medium text-foreground truncate max-w-[200px]">{c.name}</td>
                      <td className="px-8 py-3.5 text-sm text-muted-foreground text-right">{c.bookings}</td>
                      <td className="px-8 py-3.5 text-sm text-muted-foreground text-right hidden sm:table-cell">{c.kids}</td>
                      <td className="px-8 py-3.5 text-right hidden sm:table-cell">
                        {fillRate !== null ? (
                          <span className={`text-sm font-medium ${fillRate >= 100 ? "text-emerald-600" : fillRate >= 80 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {fillRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-8 py-3.5 text-sm font-medium text-foreground text-right">{fmt(c.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Top guests */}
      {analytics && analytics.topGuests.length > 0 && (
        <Card className="py-0">
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Top guests</CardTitle>
              <Link href="/host/guests" className="text-xs text-primary hover:underline underline-offset-2">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-8 py-2.5 text-left text-xs font-medium text-muted-foreground">Family</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Bookings</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Last booked</th>
                  <th className="px-8 py-2.5 text-right text-xs font-medium text-muted-foreground">Total spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {analytics.topGuests.map((g, i) => (
                  <tr key={g.email} className="hover:bg-muted/20 transition-colors">
                    <td className="px-8 py-3.5">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="material-symbols-outlined text-amber-500 select-none shrink-0" style={{ fontSize: 16 }}>star</span>
                        )}
                        <span className="text-sm text-foreground truncate max-w-[180px]">{g.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-3.5 text-sm text-muted-foreground text-right hidden sm:table-cell">{g.bookings}</td>
                    <td className="px-8 py-3.5 text-xs text-muted-foreground text-right hidden sm:table-cell whitespace-nowrap">
                      {g.lastBooked ? fmtDate(g.lastBooked) : "—"}
                    </td>
                    <td className="px-8 py-3.5 text-sm font-medium text-foreground text-right">{fmt(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
