"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/EmptyState";

type BookingRow = {
  id: string;
  created_at: string;
  total_cents: number | null;
  platform_fee_percent: number | null;
  guests_count: number | null;
  contact_email: string | null;
  camps: { name: string; host_id: string } | null;
};

type Guest = {
  email: string;
  totalSpent: number;
  bookingCount: number;
  camps: string[];
  firstBooked: string;
  lastBooked: string;
  bookings: BookingRow[];
};

type SortKey = "spent" | "bookings" | "recent";

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function HostGuestsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("spent");
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const guests = useMemo<Guest[]>(() => {
    const map: Record<string, Guest> = {};
    for (const b of bookings) {
      const e = b.contact_email ?? "unknown";
      if (!map[e]) {
        map[e] = {
          email: e,
          totalSpent: 0,
          bookingCount: 0,
          camps: [],
          firstBooked: b.created_at,
          lastBooked: b.created_at,
          bookings: [],
        };
      }
      map[e].totalSpent += b.total_cents ?? 0;
      map[e].bookingCount++;
      map[e].bookings.push(b);
      const campName = b.camps?.name;
      if (campName && !map[e].camps.includes(campName)) map[e].camps.push(campName);
      if (b.created_at < map[e].firstBooked) map[e].firstBooked = b.created_at;
      if (b.created_at > map[e].lastBooked) map[e].lastBooked = b.created_at;
    }
    return Object.values(map).filter((g) => g.email !== "unknown");
  }, [bookings]);

  // Top spender threshold for VIP badge
  const vipThreshold = useMemo(() => {
    if (guests.length < 3) return Infinity;
    const sorted = [...guests].sort((a, b) => b.totalSpent - a.totalSpent);
    return sorted[Math.max(0, Math.ceil(guests.length * 0.2) - 1)]?.totalSpent ?? Infinity;
  }, [guests]);

  const filtered = useMemo(() => {
    let list = guests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.email.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sort === "spent") return b.totalSpent - a.totalSpent;
      if (sort === "bookings") return b.bookingCount - a.bookingCount;
      return b.lastBooked.localeCompare(a.lastBooked);
    });
  }, [guests, search, sort]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-card bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!guests.length) {
    return (
      <EmptyState
        icon="child_hat"
        iconBg="bg-yellow-300"
        iconColor="text-yellow-900"
        title="No guests yet"
        description="Families who book your activities will appear here with their full booking history."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {guests.length} {guests.length === 1 ? "family" : "families"}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-rounded pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground select-none" style={{ fontSize: 15 }}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="h-8 rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-primary/50 w-48"
            />
          </div>
          <div className="flex items-center gap-1">
            {([
              { key: "spent" as SortKey, label: "Top spenders" },
              { key: "bookings" as SortKey, label: "Most bookings" },
              { key: "recent" as SortKey, label: "Recent" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guest rows */}
      <div className="rounded-card overflow-hidden divide-y divide-border">
        {filtered.map((guest) => {
          const isVip = guest.totalSpent >= vipThreshold && guest.totalSpent > 0;
          const isOpen = expanded === guest.email;
          return (
            <div key={guest.email}>
              {/* Row */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : guest.email)}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors text-left"
              >
                {/* VIP / avatar */}
                <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold ${
                  isVip ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                }`}>
                  {isVip
                    ? <span className="material-symbols-rounded select-none" style={{ fontSize: 15 }}>star</span>
                    : guest.email[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Email + camps */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{guest.email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {guest.camps.slice(0, 2).join(" · ")}
                    {guest.camps.length > 2 ? ` +${guest.camps.length - 2} more` : ""}
                  </p>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">{fmt(guest.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {guest.bookingCount} {guest.bookingCount === 1 ? "booking" : "bookings"}
                  </p>
                </div>

                <div className="text-right shrink-0 hidden md:block min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Last booked</p>
                  <p className="text-xs text-foreground">{fmtDate(guest.lastBooked)}</p>
                </div>

                <span className={`material-symbols-rounded text-muted-foreground select-none shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ fontSize: 18 }}>
                  expand_more
                </span>
              </button>

              {/* Expanded booking history */}
              {isOpen && (
                <div className="bg-muted/20 border-t border-border px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking history</p>
                    <div className="text-xs text-muted-foreground">
                      LTV: <span className="font-semibold text-foreground">{fmt(guest.totalSpent)}</span>
                      {" · "}First booked {fmtDate(guest.firstBooked)}
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden divide-y divide-border/60">
                    {guest.bookings.map((b) => {
                      const gross = b.total_cents ?? 0;
                      return (
                        <div key={b.id} className="flex items-center gap-3 bg-background px-3 py-2.5 text-xs">
                          <span className="text-muted-foreground whitespace-nowrap w-24 shrink-0">{fmtDate(b.created_at)}</span>
                          <span className="flex-1 text-foreground truncate">{b.camps?.name ?? "—"}</span>
                          <span className="text-muted-foreground shrink-0">
                            {b.guests_count ?? 1} {(b.guests_count ?? 1) === 1 ? "guest" : "guests"}
                          </span>
                          <span className="font-medium text-foreground shrink-0">{fmt(gross)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
