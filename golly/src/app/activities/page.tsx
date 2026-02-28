"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarEventList } from "@/components/calendar/CalendarEventList";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";

import type { CalendarEvent, CalendarCamp } from "@/hooks/useMyCalendar";

/* ── lazy-load FullCalendar (client-only, big bundle) ── */
const FullCalendarView = dynamic(
  () =>
    import("@/components/calendar/FullCalendarView").then((m) => ({
      default: m.FullCalendarView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] sm:h-[600px] flex items-center justify-center text-sm text-muted-foreground">
        Loading calendar...
      </div>
    ),
  }
);

/* ── types ──────────────────────────────────────────── */

type ViewMode = "list" | "calendar";
type CalendarTab = "agenda" | "week" | "month";

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  avatar_emoji: string | null;
};

type FriendProfile = {
  id: string;
  name: string;
  children: Child[];
};

/* calendar pill colors — rotated per child */
const CHILD_COLORS = [
  { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", hex: "#f97316" },
  { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-500", hex: "#0ea5e9" },
  { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", hex: "#10b981" },
  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500", hex: "#8b5cf6" },
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500", hex: "#f43f5e" },
  { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", hex: "#f59e0b" },
];

/* ── helpers ────────────────────────────────────────── */

const pad2 = (n: number) => String(n).padStart(2, "0");
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function deriveTimesFromFixedSchedule(meta: any): {
  startAt: string | null;
  endAt: string | null;
} {
  const fs = meta?.fixedSchedule;
  if (!fs?.startDate || !fs?.startTime) return { startAt: null, endAt: null };
  const start = new Date(`${fs.startDate}T${fs.startTime}:00`);
  const startAt = Number.isNaN(start.getTime()) ? null : start.toISOString();
  let endAt: string | null = null;
  if (fs?.endDate && fs?.endTime) {
    const end = new Date(`${fs.endDate}T${fs.endTime}:00`);
    endAt = Number.isNaN(end.getTime()) ? null : end.toISOString();
  }
  return { startAt, endAt };
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/* ── page ───────────────────────────────────────────── */

export default function ActivitiesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* view state */
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("month");
  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(new Date()));

  /* mobile sidebar sheet */
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* share modal */
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  /* data */
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);

  /* sidebar filter state */
  const [enabledChildren, setEnabledChildren] = useState<Set<string>>(
    new Set()
  );
  const [enabledFriends, setEnabledFriends] = useState<Set<string>>(
    new Set()
  );

  /* ── load data ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      /* 1. Load children */
      const { data: childRows } = await supabase
        .from("children")
        .select("id, legal_name, preferred_name, avatar_emoji")
        .eq("parent_id", uid)
        .order("created_at", { ascending: true });
      const kids = (childRows || []) as Child[];
      setMyChildren(kids);
      setEnabledChildren(new Set(kids.map((c) => c.id)));

      /* 2. Load bookings */
      const { data: bookingData, error: bErr } = await supabase
        .from("bookings")
        .select(
          `id, camp_id, status, guests_count, camps:camp_id (id, name, location, image_url, start_time, end_time, meta)`
        )
        .eq("user_id", uid)
        .in("status", ["confirmed", "pending"])
        .order("created_at", { ascending: false });

      if (bErr) {
        setError("Could not load your activities.");
        setLoading(false);
        return;
      }

      const events: CalendarEvent[] = [];
      for (const row of (bookingData || []) as any[]) {
        const campRow = row.camps;
        const camp: CalendarCamp = campRow
          ? {
              id: campRow.id,
              name: campRow.name,
              location: campRow.location,
              image_url: campRow.image_url,
              meta: campRow.meta,
            }
          : { id: row.camp_id, name: "Unknown camp" };
        let startAt: string | null = campRow?.start_time ?? null;
        let endAt: string | null = campRow?.end_time ?? null;
        if (!startAt) {
          const derived = deriveTimesFromFixedSchedule(campRow?.meta);
          startAt = derived.startAt;
          if (!endAt) endAt = derived.endAt;
        }
        if (!startAt) continue;
        const startDate = new Date(startAt);
        if (Number.isNaN(startDate.getTime())) continue;
        const computedEnd =
          endAt ||
          new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
        events.push({
          id: row.id,
          camp_id: row.camp_id,
          start_at: startAt,
          end_at: computedEnd,
          camp,
          booking_status: row.status,
          guests_count: row.guests_count,
        });
      }
      events.sort((a, b) => a.start_at.localeCompare(b.start_at));
      setAllEvents(events);

      /* 3. Load shared calendars (friends) */
      const { data: shareRows } = await supabase
        .from("calendar_shares")
        .select("sender_id")
        .eq("recipient_user_id", uid)
        .eq("status", "accepted");
      const senderIds = Array.from(
        new Set(
          (shareRows || [])
            .map((r: any) => r.sender_id)
            .filter(Boolean) as string[]
        )
      );
      if (senderIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name")
          .in("id", senderIds);
        const friendProfiles: FriendProfile[] = (profileData || []).map(
          (p: any) => ({
            id: p.id,
            name:
              p.preferred_first_name?.trim() ||
              p.legal_name?.trim() ||
              "Friend",
            children: [],
          })
        );
        setFriends(friendProfiles);
        setEnabledFriends(new Set(friendProfiles.map((f) => f.id)));

        // Fetch each friend's bookings and merge into events
        const friendEventArrays = await Promise.all(
          senderIds.map(async (friendId) => {
            const { data: fBookings } = await supabase
              .from("bookings")
              .select(`id, camp_id, status, guests_count, camps:camp_id (id, name, location, image_url, start_time, end_time, meta)`)
              .eq("user_id", friendId)
              .in("status", ["confirmed", "pending"])
              .order("created_at", { ascending: false });

            const fEvents: CalendarEvent[] = [];
            for (const row of (fBookings || []) as any[]) {
              const campRow = row.camps;
              const camp: CalendarCamp = campRow
                ? { id: campRow.id, name: campRow.name, location: campRow.location, image_url: campRow.image_url, meta: campRow.meta }
                : { id: row.camp_id, name: "Unknown camp" };
              let startAt: string | null = campRow?.start_time ?? null;
              let endAt: string | null = campRow?.end_time ?? null;
              if (!startAt) {
                const derived = deriveTimesFromFixedSchedule(campRow?.meta);
                startAt = derived.startAt;
                if (!endAt) endAt = derived.endAt;
              }
              if (!startAt) continue;
              const startDate = new Date(startAt);
              if (Number.isNaN(startDate.getTime())) continue;
              const computedEnd = endAt || new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
              fEvents.push({
                id: `friend-${friendId}-${row.id}`,
                camp_id: row.camp_id,
                start_at: startAt,
                end_at: computedEnd,
                camp,
                booking_status: row.status,
                guests_count: row.guests_count,
                friendId,
              });
            }
            return fEvents;
          })
        );

        const allFriendEvents = friendEventArrays.flat();
        events.push(...allFriendEvents);
        events.sort((a, b) => a.start_at.localeCompare(b.start_at));
      }

      setLoading(false);
    };
    void load();
  }, []);

  /* ── child color mapping ── */
  const childColorMap = useMemo(() => {
    const map = new Map<string, (typeof CHILD_COLORS)[0]>();
    myChildren.forEach((c, i) =>
      map.set(c.id, CHILD_COLORS[i % CHILD_COLORS.length])
    );
    return map;
  }, [myChildren]);

  /* ── events grouped by date (filtered by enabled friends) ── */
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const ev of allEvents) {
      // Hide friend events whose calendar is toggled off
      if (ev.friendId && !enabledFriends.has(ev.friendId)) continue;
      const key = ymdLocal(new Date(ev.start_at));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    }
    return grouped;
  }, [allEvents, enabledFriends]);

  /* ── upcoming events for list / agenda ── */
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter((ev) => new Date(ev.end_at) >= now);
  }, [allEvents]);

  /* ── month navigation ── */
  const goToday = () => setViewMonth(monthStart(new Date()));
  const goPrev = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goNext = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthLabelShort = viewMonth.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  /* ── toggle helpers ── */
  const toggleChild = useCallback((childId: string) => {
    setEnabledChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  }, []);

  const toggleFriend = useCallback((friendId: string) => {
    setEnabledFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }, []);

  /* ── FullCalendar events ── */
  const fullCalendarEvents = useMemo(() => {
    return allEvents.map((ev) => ({
      id: ev.id,
      title: ev.camp.name,
      start: ev.start_at,
      end: ev.end_at,
      backgroundColor: CHILD_COLORS[0].hex,
      borderColor: CHILD_COLORS[0].hex,
      extendedProps: { campId: ev.camp_id, location: ev.camp.location },
    }));
  }, [allEvents]);

  /* ── share handlers ── */
  const handleShare = async () => {
    const email = shareEmail.trim();
    if (!email || !email.includes("@")) {
      setShareStatus("Please enter a valid email.");
      return;
    }
    setSharing(true);
    setShareStatus(null);
    try {
      const { error: fnErr } = await supabase.functions.invoke("share-calendar", {
        body: { mode: "send", email, message: shareMessage.trim() || null },
      });
      if (fnErr) { setShareStatus("Could not send invite. Please try again."); return; }
      setShareStatus("Invite sent!");
      setShareEmail("");
      setShareMessage("");
      setTimeout(() => { setShareOpen(false); setShareStatus(null); }, 1200);
    } catch {
      setShareStatus("Could not send invite.");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("share-calendar", {
        body: { mode: "link_only" },
      });
      if (fnErr || !data?.share_url) { setShareStatus("Could not generate link."); return; }
      await navigator.clipboard.writeText(data.share_url);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setShareStatus("Could not copy link.");
    }
  };

  /* ── shared sidebar props ── */
  const sidebarProps = {
    viewMonth,
    setViewMonth,
    eventsByDate,
    myChildren,
    enabledChildren,
    toggleChild,
    friends,
    enabledFriends,
    toggleFriend,
    childColorMap,
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          My Activities
        </h1>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          {viewMode === "calendar" && (
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              aria-label="Open filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span className="hidden xs:inline">Filters</span>
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setShareOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </Button>
        </div>
      </div>

      {/* ── View toggle bar ── */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-border overflow-x-auto">
        {/* List / Calendar toggle */}
        <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden text-sm shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="List view"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Calendar view"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>

        {/* Calendar sub-tabs */}
        {viewMode === "calendar" && (
          <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden text-xs sm:text-sm shrink-0">
            {(["agenda", "week", "month"] as CalendarTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCalendarTab(t)}
                className={`px-2 sm:px-3 py-1.5 font-medium capitalize transition-colors ${
                  calendarTab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Today + month nav */}
        {viewMode === "calendar" && (
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-border bg-card px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goPrev}
              className="rounded-md hover:bg-accent h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground"
              aria-label="Previous"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-md hover:bg-accent h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground"
              aria-label="Next"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            {/* Long label on sm+, short on mobile */}
            <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:inline">
              {monthLabel}
            </span>
            <span className="text-xs font-medium text-foreground sm:hidden">
              {monthLabelShort}
            </span>
          </div>
        )}
      </div>

      {/* ── Auth guard ── */}
      {!loading && !userId && (
        <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground text-center">
          Please sign in to see your activities.
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-card p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground text-center animate-pulse">
          Loading your activities...
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && userId && !error && (
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          {viewMode === "calendar" && (
            <div className="hidden lg:block w-60 xl:w-64 shrink-0">
              <CalendarSidebar {...sidebarProps} />
            </div>
          )}

          {/* Main area */}
          <div className="flex-1 min-w-0">
            {/* List view */}
            {viewMode === "list" && (
              <CalendarEventList
                events={upcomingEvents}
                loading={false}
                error={null}
              />
            )}

            {/* Calendar agenda (schedule) */}
            {viewMode === "calendar" && calendarTab === "agenda" && (
              <CalendarEventList
                events={upcomingEvents}
                loading={false}
                error={null}
              />
            )}

            {/* Calendar month / week (FullCalendar) */}
            {viewMode === "calendar" &&
              (calendarTab === "month" || calendarTab === "week") && (
                <FullCalendarView
                  events={fullCalendarEvents}
                  viewMonth={viewMonth}
                  calendarTab={calendarTab}
                  onDateClick={(dateStr: string) => {
                    /* on mobile clicking a day switches to agenda for that day */
                    if (window.innerWidth < 640) {
                      setCalendarTab("agenda");
                    }
                  }}
                  onMonthChange={(d: Date) => {
                    const next = monthStart(d);
                    setViewMonth((prev) =>
                      prev.getTime() === next.getTime() ? prev : next,
                    );
                  }}
                />
              )}

            {/* Empty state */}
            {allEvents.length === 0 && !loading && (
              <div className="rounded-2xl bg-card p-6 sm:p-8 text-center mt-4">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-muted-foreground mb-3">
                  No upcoming activities on your calendar yet.
                </p>
                <Button size="sm" onClick={() => router.push("/search")}>
                  Find an activity
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {mobileFilterOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMobileFilterOpen(false)}
          />
          {/* sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden animate-in slide-in-from-bottom duration-300">
            <div className="bg-card rounded-t-2xl border-t border-border shadow-2xl max-h-[75vh] overflow-y-auto">
              {/* handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Calendar Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* sidebar content */}
              <div className="p-4">
                <CalendarSidebar {...sidebarProps} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Share calendar modal ── */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShareOpen(false); setShareStatus(null); } }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-card shadow-xl">
            <button
              type="button"
              onClick={() => { setShareOpen(false); setShareStatus(null); }}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              aria-label="Close"
            >
              &#10005;
            </button>

            <div className="px-6 pt-8 pb-6 space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Share your calendar
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Invite a friend by email or copy a shareable link.
                </p>
              </div>

              {/* Copy link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copyDone ? "Copied!" : "Copy link"}
              </button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span>or send by email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="friend@email.com"
                  type="email"
                  disabled={sharing}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleShare(); }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Message (optional)</label>
                <Textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={2}
                  placeholder="Add a note…"
                  disabled={sharing}
                />
              </div>

              {shareStatus && (
                <p className={`text-xs ${shareStatus.includes("sent") || shareStatus.includes("Copied") ? "text-emerald-600" : "text-destructive"}`}>
                  {shareStatus}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setShareOpen(false); setShareStatus(null); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleShare} disabled={sharing}>
                  {sharing ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
