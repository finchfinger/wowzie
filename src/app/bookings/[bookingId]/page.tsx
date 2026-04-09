"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type BookingDetail = {
  id: string;
  user_id: string;
  camp_id: string;
  status: string;
  guests_count: number;
  total_cents: number | null;
  created_at: string;
  contact_email: string | null;
};

type CampDetail = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  meta: any;
  host_id: string | null;
};

type Child = {
  id: string;
  legal_name: string | null;
  preferred_name: string | null;
  avatar_emoji: string | null;
};

type AttRow = {
  id: string;
  date: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function deriveCampDays(meta: any): string[] {
  const sessions: any[] = Array.isArray(meta?.campSessions) ? meta.campSessions : [];
  const days = new Set<string>();
  const addRange = (startStr: string, endStr?: string) => {
    const cur = new Date(startStr + "T12:00:00");
    const end = endStr ? new Date(endStr + "T12:00:00") : new Date(startStr + "T12:00:00");
    while (cur <= end) { days.add(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  };
  if (sessions.length > 0) {
    for (const s of sessions) { if (s.startDate) addRange(s.startDate, s.endDate); }
    if (days.size > 0) return Array.from(days).sort();
  }
  const fs = meta?.fixedSchedule ?? {};
  if (fs.startDate) { addRange(fs.startDate, fs.endDate); return Array.from(days).sort(); }
  return [];
}

function deriveDateRangeLabel(meta: any): string {
  const sessions: any[] = Array.isArray(meta?.campSessions) ? meta.campSessions : [];
  if (sessions.length > 0) {
    const allDates = sessions.flatMap((s: any) => [s.startDate, s.endDate].filter(Boolean)).sort();
    const first = allDates[0];
    const last = allDates[allDates.length - 1];
    if (!first) return "";
    const fmt = (d: string, withYear = false) =>
      new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}),
      });
    return first === last ? fmt(first, true) : `${fmt(first)} – ${fmt(last, true)}`;
  }
  const fs = meta?.fixedSchedule ?? {};
  if (fs.startDate) {
    const fmt = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return fs.endDate && fs.endDate !== fs.startDate
      ? `${fmt(fs.startDate)} – ${fmt(fs.endDate)}`
      : fmt(fs.startDate);
  }
  return "";
}

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 text-muted-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [camp, setCamp] = useState<CampDetail | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let alive = true;
    void (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) { setError("Not signed in."); setLoading(false); return; }

      const { data: bookingData, error: bookingErr } = await supabase
        .from("bookings")
        .select("id, user_id, camp_id, status, guests_count, total_cents, created_at, contact_email")
        .eq("id", bookingId)
        .eq("user_id", userId) // security: only own bookings
        .single();

      if (!alive) return;
      if (bookingErr || !bookingData) { setError("Booking not found."); setLoading(false); return; }
      setBooking(bookingData as BookingDetail);

      const [{ data: campData }, { data: childrenData }, { data: attData }] = await Promise.all([
        supabase.from("camps")
          .select("id, name, slug, location, image_url, hero_image_url, meta, host_id")
          .eq("id", bookingData.camp_id).single(),
        supabase.from("children")
          .select("id, legal_name, preferred_name, avatar_emoji")
          .eq("parent_id", userId),
        supabase.from("attendance")
          .select("id, date, checked_in_at, checked_out_at")
          .eq("booking_id", bookingId)
          .order("date", { ascending: true }),
      ]);

      if (!alive) return;
      if (campData) setCamp(campData as CampDetail);
      setChildren((childrenData ?? []) as Child[]);
      setAttendance((attData ?? []) as AttRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [bookingId]);

  const campDays = useMemo(() => camp ? deriveCampDays(camp.meta) : [], [camp]);
  const attByDate = useMemo(() => {
    const map = new Map<string, AttRow>();
    for (const a of attendance) map.set(a.date, a);
    return map;
  }, [attendance]);

  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (error || !booking || !camp) return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-destructive">{error ?? "Booking not found."}</p>
      <button onClick={() => router.push("/activities")} className="text-sm text-primary">← Back to My Activities</button>
    </div>
  );

  const heroImage = camp.hero_image_url || camp.image_url;
  const bookedOn = new Date(booking.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const guestsLabel = booking.guests_count === 1 ? "1 child" : `${booking.guests_count} children`;
  const dateRangeLabel = deriveDateRangeLabel(camp.meta);
  const checkedInCount = attendance.filter(a => a.checked_in_at).length;

  return (
    <main>
      <div className="page-container py-6">
        <div className="page-grid">
          <div className="span-8-center space-y-3">

      {/* Back */}
      <Link href="/activities" className="text-xs text-muted-foreground hover:text-foreground inline-block mb-1">
        ← My Activities
      </Link>

      {/* Hero image */}
      {heroImage && (
        <div className="relative overflow-hidden rounded-card bg-muted aspect-video">
          <Image src={heroImage} alt={camp.name} fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" />
        </div>
      )}

      {/* Camp name + dates */}
      <div className="pt-1">
        <h1 className="text-xl font-semibold text-foreground">{camp.name}</h1>
        <div className="mt-1 space-y-0.5">
          {dateRangeLabel && <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>}
          {camp.location && <p className="text-sm text-muted-foreground">{camp.location}</p>}
        </div>
      </div>

      {/* Booking status */}
      <div className="rounded-card bg-card p-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold
          ${booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700"
            : booking.status === "pending" ? "bg-amber-100 text-amber-700"
            : "bg-muted text-muted-foreground"}`}>
          {booking.status === "confirmed" ? "Booking confirmed"
            : booking.status === "pending" ? "Pending approval"
            : booking.status}
        </span>
        <p className="text-xs text-muted-foreground mt-2">Booked {bookedOn} · {guestsLabel}</p>
      </div>

      {/* Who's going */}
      {children.length > 0 && (
        <div className="rounded-card bg-card p-4">
          <SectionLabel>Who&apos;s going</SectionLabel>
          <div className="space-y-2.5">
            {children.slice(0, booking.guests_count).map(child => (
              <div key={child.id} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                  {child.avatar_emoji
                    ? child.avatar_emoji
                    : <span className="text-xs font-semibold text-muted-foreground">
                        {(child.preferred_name || child.legal_name || "?").charAt(0).toUpperCase()}
                      </span>}
                </div>
                <span className="text-sm text-foreground">{child.preferred_name || child.legal_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance */}
      {campDays.length > 0 && (
        <div className="rounded-card bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Attendance</SectionLabel>
            {checkedInCount > 0 && (
              <p className="text-xs text-muted-foreground -mt-3">{checkedInCount}/{campDays.length} days</p>
            )}
          </div>
          <div className="space-y-3">
            {campDays.map(day => {
              const att = attByDate.get(day);
              const isIn = Boolean(att?.checked_in_at);
              const isOut = Boolean(att?.checked_out_at);
              const isPast = day < today;
              const isToday = day === today;
              const d = new Date(day + "T12:00:00");
              const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

              return (
                <div key={day} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${isToday ? "font-semibold" : "text-foreground"}`}>
                      {dayLabel}
                      {isToday && <span className="ml-1.5 text-[11px] font-semibold text-primary">Today</span>}
                    </p>
                    {isIn && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        In {formatTime(att!.checked_in_at!)}
                        {isOut && <> · Out {formatTime(att!.checked_out_at!)}</>}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {isIn && isOut ? (
                      <span className="text-xs font-medium text-emerald-600">✓ Done</span>
                    ) : isIn ? (
                      <span className="text-xs font-medium text-emerald-600">✓ Checked in</span>
                    ) : isPast ? (
                      <span className="text-xs text-muted-foreground/50">Not recorded</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/30">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="rounded-card bg-card p-4">
        <SectionLabel>Payment info</SectionLabel>
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Amount paid</p>
          <p className="text-lg font-semibold text-foreground">{formatMoney(booking.total_cents)}</p>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between cursor-pointer hover:opacity-70 transition-opacity">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Get receipt
          </div>
          <ChevronRight />
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-card bg-card overflow-hidden">
        {camp.host_id && (
          <button
            type="button"
            onClick={() => router.push(`/messages?to=${camp.host_id}`)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/50">
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Message host
            </div>
            <ChevronRight />
          </button>
        )}
        {camp.slug && (
          <Link
            href={`/camp/${camp.slug}`}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View camp page
            </div>
            <ChevronRight />
          </Link>
        )}
      </div>

          </div>
        </div>
      </div>
    </main>
  );
}
