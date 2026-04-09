"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CalendarEventList } from "@/components/calendar/CalendarEventList";
import { ShareCalendarModal } from "@/components/ShareCalendarModal";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CampCard, type Camp } from "@/components/CampCard";

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

/* ── mock popular camps (fallback when DB has no published camps) ── */
const MOCK_POPULAR_CAMPS: Camp[] = [
  {
    id: "mock-art",
    slug: "junior-artists-workshop",
    name: "Junior Artists Workshop",
    description: "Painting, drawing & mixed media for young creatives ages 6–12.",
    image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80",
    hero_image_url: null,
    price_cents: 24900,
    price_unit: "week",
    listing_type: "camp",
    meta: { pricing: { display: "$249 / week" }, location: "San Francisco, CA" },
  },
  {
    id: "mock-coding",
    slug: "code-explorers-camp",
    name: "Code Explorers Camp",
    description: "Scratch, Python & game dev for kids who love computers.",
    image_url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80",
    hero_image_url: null,
    price_cents: 29900,
    price_unit: "week",
    listing_type: "camp",
    meta: { pricing: { display: "$299 / week" }, location: "Oakland, CA" },
  },
  {
    id: "mock-soccer",
    slug: "summer-soccer-academy",
    name: "Summer Soccer Academy",
    description: "Skills, drills & match play for ages 5–14. All levels welcome.",
    image_url: "https://images.unsplash.com/photo-1551958219-acbc58b6e019?w=400&q=80",
    hero_image_url: null,
    price_cents: 19900,
    price_unit: "week",
    listing_type: "camp",
    meta: { pricing: { display: "$199 / week" }, location: "Berkeley, CA" },
  },
  {
    id: "mock-music",
    slug: "rockstar-music-camp",
    name: "Rockstar Music Camp",
    description: "Guitar, drums, keys & vocals. End the week with a live performance.",
    image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    hero_image_url: null,
    price_cents: 32500,
    price_unit: "week",
    listing_type: "camp",
    meta: { pricing: { display: "$325 / week" }, location: "San Francisco, CA" },
  },
  {
    id: "mock-science",
    slug: "mad-scientists-lab",
    name: "Mad Scientists Lab",
    description: "Experiments, rockets & robotics for curious minds ages 7–13.",
    image_url: "https://images.unsplash.com/photo-1603354350317-6f7aaa5911c5?w=400&q=80",
    hero_image_url: null,
    price_cents: 27500,
    price_unit: "week",
    listing_type: "camp",
    meta: { pricing: { display: "$275 / week" }, location: "Palo Alto, CA" },
  },
];

/* ── types ──────────────────────────────────────────── */

type ViewMode = "list" | "calendar";
type CalendarTab = "agenda" | "week" | "month";

type PendingReview = {
  bookingId: string;
  campName: string;
  campThumb: string | null;
  campSlug: string | null;
};

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
  // 1. fixedSchedule (camps with a single date range)
  const fs = meta?.fixedSchedule;
  if (fs?.startDate && fs?.startTime) {
    const start = new Date(`${fs.startDate}T${fs.startTime}:00`);
    const startAt = Number.isNaN(start.getTime()) ? null : start.toISOString();
    let endAt: string | null = null;
    if (fs?.endDate && fs?.endTime) {
      const end = new Date(`${fs.endDate}T${fs.endTime}:00`);
      endAt = Number.isNaN(end.getTime()) ? null : end.toISOString();
    }
    if (startAt) return { startAt, endAt };
  }

  // 2. campSessions — recurring classes; pick the next upcoming session (or earliest if all past)
  const sessions: any[] = Array.isArray(meta?.campSessions) ? meta.campSessions : [];
  if (sessions.length > 0) {
    const now = new Date();
    const parsed = sessions
      .map((s: any) => {
        if (!s?.startDate) return null;
        const time = s.startTime ?? "00:00";
        const d = new Date(`${s.startDate}T${time}:00`);
        return Number.isNaN(d.getTime()) ? null : { startAt: d.toISOString(), endAt: s.endDate && s.endTime ? new Date(`${s.endDate}T${s.endTime}:00`).toISOString() : null, d };
      })
      .filter(Boolean) as { startAt: string; endAt: string | null; d: Date }[];

    if (parsed.length > 0) {
      const upcoming = parsed.filter((s) => s.d >= now);
      const chosen = upcoming.length > 0 ? upcoming[0] : parsed[0];
      return { startAt: chosen.startAt, endAt: chosen.endAt };
    }
  }

  // 3. classSchedule.sections fallback
  const sections: any[] = Array.isArray(meta?.classSchedule?.sections) ? meta.classSchedule.sections : [];
  if (sections.length > 0) {
    const s = sections[0];
    if (s?.startDate) {
      const time = s.startTime ?? "00:00";
      const start = new Date(`${s.startDate}T${time}:00`);
      const startAt = Number.isNaN(start.getTime()) ? null : start.toISOString();
      if (startAt) return { startAt, endAt: null };
    }
  }

  return { startAt: null, endAt: null };
}

const DAY_KEY_TO_NUM: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const DAY_KEY_TO_NAME: Record<string, string> = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday",
};

function fmt12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  const min = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${hour}${min}${period}`;
}

/**
 * For recurring classes that have meta.classSchedule.weekly (or meta.weeklySchedule),
 * generate the next `weeksAhead` occurrences of each scheduled day and return them
 * as CalendarEvents so they show up on the actual calendar dates.
 */
function generateRecurringEvents(
  meta: any,
  bookingId: string,
  camp: CalendarCamp,
  bookingStatus: string,
  guestsCount: number,
  weeksAhead = 16,
): CalendarEvent[] {
  // Try classSchedule.weekly first, then top-level weeklySchedule
  const weekly: Record<string, any> | undefined =
    meta?.classSchedule?.weekly ?? meta?.weeklySchedule;
  if (!weekly || typeof weekly !== "object") return [];

  const now = new Date();
  // Optional: don't generate before sessionStartDate if one is set
  const sessionStart = meta?.classSchedule?.sessionStartDate
    ? new Date(meta.classSchedule.sessionStartDate)
    : null;
  const windowEnd = new Date(
    now.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000
  );

  const results: CalendarEvent[] = [];

  for (const [dayKey, schedule] of Object.entries(weekly)) {
    if (!schedule?.available) continue;
    const blocks: { id?: string; start: string; end: string }[] =
      Array.isArray(schedule.blocks) ? schedule.blocks : [];
    if (blocks.length === 0) continue;

    const targetDow = DAY_KEY_TO_NUM[dayKey];
    if (targetDow === undefined) continue;

    // Find the first occurrence of this weekday >= today
    const startFrom = sessionStart && sessionStart > now ? sessionStart : now;
    const startFromDay = new Date(startFrom);
    startFromDay.setHours(0, 0, 0, 0);
    const currentDow = startFromDay.getDay();
    const daysUntil = (targetDow - currentDow + 7) % 7;
    const firstOccurrence = new Date(startFromDay);
    firstOccurrence.setDate(firstOccurrence.getDate() + daysUntil);

    for (const block of blocks) {
      if (!block.start || !block.end) continue;
      const [sh, sm] = block.start.split(":").map(Number);
      const [eh, em] = block.end.split(":").map(Number);
      const recurrenceLabel = `Every ${DAY_KEY_TO_NAME[dayKey] ?? dayKey} at ${fmt12(block.start)}`;

      let cursor = new Date(firstOccurrence);
      while (cursor <= windowEnd) {
        const startDate = new Date(cursor);
        startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(cursor);
        endDate.setHours(eh, em, 0, 0);

        results.push({
          id: `${bookingId}-${dayKey}-${cursor.toISOString().slice(0, 10)}`,
          camp_id: camp.id,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          camp,
          booking_status: bookingStatus,
          guests_count: guestsCount,
          recurrenceLabel,
        });

        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
    }
  }

  return results;
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("month");
  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(new Date()));

  /* mobile sidebar sheet */
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* share modal */
  const [shareOpen, setShareOpen] = useState(false);

  /* data */
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [suggestedCamps, setSuggestedCamps] = useState<Camp[]>([]);

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
          `id, camp_id, status, guests_count, total_cents, created_at, camps:camp_id (id, name, slug, location, image_url, hero_image_url, start_time, end_time, meta)`
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
              slug: campRow.slug ?? null,
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
        if (!startAt) {
          // Try to generate recurring events from weekly schedule
          const recurring = generateRecurringEvents(
            campRow?.meta,
            row.id,
            camp,
            row.status,
            row.guests_count,
          );
          events.push(...recurring);
          continue;
        }
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

      /* 3. Detect past bookings awaiting review */
      try {
        const nowMs = Date.now();
        const pastConfirmed = ((bookingData || []) as any[]).filter((row) => {
          const endTime = row.camps?.end_time;
          return endTime && new Date(endTime).getTime() < nowMs && row.status === "confirmed";
        });

        if (pastConfirmed.length > 0) {
          const bookingIds = pastConfirmed.map((b: any) => b.id as string);
          const { data: reviewedRows } = await supabase
            .from("reviews")
            .select("booking_id")
            .in("booking_id", bookingIds)
            .eq("reviewer_id", uid);
          const reviewedSet = new Set(
            ((reviewedRows ?? []) as any[]).map((r) => r.booking_id as string)
          );
          const toReview: PendingReview[] = pastConfirmed
            .filter((b: any) => !reviewedSet.has(b.id as string))
            .slice(0, 5)
            .map((b: any) => ({
              bookingId: b.id as string,
              campName: (b.camps?.name as string) ?? "Unknown activity",
              campThumb:
                (b.camps?.hero_image_url as string | null) ??
                (b.camps?.image_url as string | null) ??
                null,
              campSlug: (b.camps?.slug as string | null) ?? null,
            }));
          setPendingReviews(toReview);
        }
      } catch {
        // silently skip if reviews table doesn't exist
      }

      /* 4. Load shared calendars (friends) */
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

      /* Load suggested camps whenever events list is empty */
      if (events.length === 0) {
        const { data: campRows } = await supabase
          .from("camps")
          .select("id, slug, name, description, image_url, hero_image_url, price_cents, price_unit, listing_type, meta")
          .eq("status", "published")
          .limit(6);
        if (campRows && campRows.length > 0) {
          setSuggestedCamps(campRows as Camp[]);
        } else {
          // Fallback mock suggestions so the section is never empty
          setSuggestedCamps(MOCK_POPULAR_CAMPS);
        }
      }
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

  /* ── list view events: deduplicate recurring classes to one row per camp ── */
  const listEvents = useMemo(() => {
    const now = new Date();
    const upcoming = allEvents.filter((ev) => new Date(ev.end_at) >= now);
    // Group by camp_id. For recurring (has recurrenceLabel), keep only the earliest upcoming.
    const seen = new Map<string, CalendarEvent>();
    for (const ev of upcoming) {
      const key = ev.recurrenceLabel ? `recurring-${ev.camp_id}` : ev.id;
      if (!seen.has(key)) seen.set(key, ev);
    }
    return Array.from(seen.values()).sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [allEvents]);

  /* ── month navigation ── */
  const goToday = () => setViewMonth(monthStart(new Date()));
  const goPrev = () => {
    if (calendarTab === "week") {
      setViewMonth((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
    } else {
      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    }
  };
  const goNext = () => {
    if (calendarTab === "week") {
      setViewMonth((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
    } else {
      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
    }
  };
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
      extendedProps: { campId: ev.camp_id, slug: ev.camp.slug ?? null, location: ev.camp.location },
    }));
  }, [allEvents]);

  /* ── First upcoming event date (used to seed week view) ── */
  const firstUpcomingDate = useMemo(() => {
    const now = new Date();
    const upcoming = allEvents.find((ev) => new Date(ev.start_at) >= now);
    return upcoming ? new Date(upcoming.start_at) : now;
  }, [allEvents]);

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
    <main>
      <div className="page-container py-4 sm:py-6 lg:py-8">
        <div className="page-grid">
          <div className="span-12">
      <PageHeader
        title="My Activities"
        actions={!loading && allEvents.length > 0 ? (
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setShareOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </Button>
        ) : undefined}
      />

      {/* ── Pending reviews prompt ── */}
      {!loading && pendingReviews.length > 0 && (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            ★{" "}
            {pendingReviews.length === 1
              ? "How was your recent activity?"
              : `How were your ${pendingReviews.length} recent activities?`}
          </p>
          <div className="space-y-2">
            {pendingReviews.map((pr) => (
              <div key={pr.bookingId} className="flex items-center gap-3">
                {pr.campThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pr.campThumb}
                    alt=""
                    className="h-9 w-9 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-amber-200/60 shrink-0">
                  </div>
                )}
                <p className="flex-1 min-w-0 truncate text-sm font-medium text-amber-900">
                  {pr.campName}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/review/${pr.bookingId}`)}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  Rate it
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View controls (only when user has activities) ── */}
      {!loading && allEvents.length > 0 && (
      <div className="flex items-center gap-2 sm:gap-3 mt-3 mb-4 overflow-x-auto">
          {/* List / Calendar toggle */}
          <div className="inline-flex rounded-lg bg-card overflow-hidden text-sm shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span className="hidden sm:inline">List view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Calendar view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="hidden sm:inline">Calendar view</span>
            </button>
          </div>

          {/* Agenda / Week / Month sub-tabs — full calendar only */}
          {viewMode === "calendar" && (
            <div className="inline-flex rounded-lg bg-card overflow-hidden text-xs sm:text-sm shrink-0">
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

          {/* Mobile filter button */}
          {viewMode === "calendar" && (
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              aria-label="Open filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span className="hidden xs:inline">Filters</span>
            </button>
          )}

          {/* Today + month nav */}
          {viewMode === "calendar" && (
            <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg bg-card px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-foreground hover:bg-accent transition-colors mr-1 sm:mr-2"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goPrev}
                className="rounded-full hover:bg-accent h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground transition-colors"
                aria-label="Previous"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-xs sm:text-sm font-semibold text-foreground min-w-[7rem] sm:min-w-[9rem] text-center hidden sm:inline">
                {monthLabel}
              </span>
              <span className="text-[11px] font-semibold text-foreground min-w-[5.5rem] text-center sm:hidden">
                {monthLabelShort}
              </span>

              <button
                type="button"
                onClick={goNext}
                className="rounded-full hover:bg-accent h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground transition-colors"
                aria-label="Next"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Auth guard ── */}
      {!loading && !userId && (
        <div className="rounded-card bg-card p-6 text-sm text-muted-foreground text-center">
          Please sign in to see your activities.
        </div>
      )}

      {!loading && error && (
        <div className="rounded-card bg-card p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-card bg-card p-6 text-sm text-muted-foreground text-center animate-pulse">
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
            {/* Empty state — shown instead of calendar/list when no events */}
            {allEvents.length === 0 && !loading ? (
              <>
                <EmptyState
                  icon="camping"
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  title="No activities yet"
                  description="Browse camps and classes near you — once you book something it'll show up here."
                  action={{ label: "Find an activity", href: "/search" }}
                />

                {/* Popular suggestions */}
                {suggestedCamps.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-foreground">Popular activities near you</h2>
                      <Link href="/search" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Explore all
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {suggestedCamps.slice(0, 5).map((camp) => (
                        <CampCard key={camp.id} camp={camp} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* List view */}
                {viewMode === "list" && (
                  <CalendarEventList
                    events={listEvents}
                    loading={false}
                    error={null}
                    mode="list"
                  />
                )}

                {/* Calendar agenda (schedule) */}
                {viewMode === "calendar" && calendarTab === "agenda" && (
                  <CalendarEventList
                    events={upcomingEvents}
                    loading={false}
                    error={null}
                    mode="agenda"
                  />
                )}

                {/* Calendar month / week (FullCalendar) */}
                {viewMode === "calendar" &&
                  (calendarTab === "month" || calendarTab === "week") && (
                    <FullCalendarView
                      events={fullCalendarEvents}
                      viewMonth={viewMonth}
                      calendarTab={calendarTab}
                      firstUpcomingDate={firstUpcomingDate}
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
              </>
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
      {userId && (
        <ShareCalendarModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          userId={userId}
        />
      )}
          </div>
        </div>
      </div>
    </main>
  );
}
