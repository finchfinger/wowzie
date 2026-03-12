"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
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

/* ── types ── */

type ViewMode = "list" | "calendar";
type CalendarTab = "agenda" | "week" | "month";

/* ── helpers ── */

const pad2 = (n: number) => String(n).padStart(2, "0");
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function deriveTimesFromFixedSchedule(meta: any): {
  startAt: string | null;
  endAt: string | null;
} {
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

  const sessions: any[] = Array.isArray(meta?.campSessions) ? meta.campSessions : [];
  if (sessions.length > 0) {
    const now = new Date();
    const parsed = sessions
      .map((s: any) => {
        if (!s?.startDate) return null;
        const time = s.startTime ?? "00:00";
        const d = new Date(`${s.startDate}T${time}:00`);
        return Number.isNaN(d.getTime())
          ? null
          : {
              startAt: d.toISOString(),
              endAt:
                s.endDate && s.endTime
                  ? new Date(`${s.endDate}T${s.endTime}:00`).toISOString()
                  : null,
              d,
            };
      })
      .filter(Boolean) as { startAt: string; endAt: string | null; d: Date }[];

    if (parsed.length > 0) {
      const upcoming = parsed.filter((s) => s.d >= now);
      const chosen = upcoming.length > 0 ? upcoming[0] : parsed[0];
      return { startAt: chosen.startAt, endAt: chosen.endAt };
    }
  }

  const sections: any[] = Array.isArray(meta?.classSchedule?.sections)
    ? meta.classSchedule.sections
    : [];
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

function generateRecurringEvents(
  meta: any,
  bookingId: string,
  camp: CalendarCamp,
  bookingStatus: string,
  guestsCount: number,
  weeksAhead = 16,
): CalendarEvent[] {
  const weekly: Record<string, any> | undefined =
    meta?.classSchedule?.weekly ?? meta?.weeklySchedule;
  if (!weekly || typeof weekly !== "object") return [];

  const now = new Date();
  const sessionStart = meta?.classSchedule?.sessionStartDate
    ? new Date(meta.classSchedule.sessionStartDate)
    : null;
  const windowEnd = new Date(now.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
  const results: CalendarEvent[] = [];

  for (const [dayKey, schedule] of Object.entries(weekly)) {
    if (!schedule?.available) continue;
    const blocks: { id?: string; start: string; end: string }[] =
      Array.isArray(schedule.blocks) ? schedule.blocks : [];
    if (blocks.length === 0) continue;

    const targetDow = DAY_KEY_TO_NUM[dayKey];
    if (targetDow === undefined) continue;

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

const FRIEND_EVENT_COLOR = "#f97316"; // orange

/* ── page ── */

export default function FriendActivitiesPage() {
  const { friendId } = useParams<{ friendId: string }>();

  const [friendName, setFriendName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* view state */
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("month");
  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(new Date()));

  /* mobile sidebar sheet */
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* data */
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);

  /* ── load data ── */
  useEffect(() => {
    if (!friendId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      // Load friend's profile name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("legal_name, preferred_first_name")
        .eq("id", friendId)
        .maybeSingle();
      if (profileData) {
        const name =
          (profileData as any).preferred_first_name?.trim() ||
          (profileData as any).legal_name?.trim() ||
          null;
        setFriendName(name);
      }

      // Load friend's bookings
      const { data: bookingData, error: bErr } = await supabase
        .from("bookings")
        .select(
          `id, camp_id, status, guests_count, created_at, camps:camp_id (id, name, slug, location, image_url, hero_image_url, start_time, end_time, meta)`
        )
        .eq("user_id", friendId)
        .in("status", ["confirmed", "pending"])
        .order("created_at", { ascending: false });

      if (bErr) {
        setError("Could not load activities.");
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
          const recurring = generateRecurringEvents(
            campRow?.meta, row.id, camp, row.status, row.guests_count
          );
          events.push(...recurring);
          continue;
        }

        const startDate = new Date(startAt);
        if (Number.isNaN(startDate.getTime())) continue;
        const computedEnd =
          endAt || new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
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
      setLoading(false);
    };

    void load();
  }, [friendId]);

  /* ── events grouped by date ── */
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const ev of allEvents) {
      const key = ymdLocal(new Date(ev.start_at));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    }
    return grouped;
  }, [allEvents]);

  /* ── upcoming events for agenda ── */
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter((ev) => new Date(ev.end_at) >= now);
  }, [allEvents]);

  /* ── list view events (recurring deduped to one row per camp) ── */
  const listEvents = useMemo(() => {
    const now = new Date();
    const upcoming = allEvents.filter((ev) => new Date(ev.end_at) >= now);
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
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthLabelShort = viewMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  /* ── FullCalendar events ── */
  const fullCalendarEvents = useMemo(() => {
    return allEvents.map((ev) => ({
      id: ev.id,
      title: ev.camp.name,
      start: ev.start_at,
      end: ev.end_at,
      backgroundColor: FRIEND_EVENT_COLOR,
      borderColor: FRIEND_EVENT_COLOR,
      extendedProps: { campId: ev.camp_id, slug: ev.camp.slug ?? null, location: ev.camp.location },
    }));
  }, [allEvents]);

  /* ── First upcoming event date (seeds week view) ── */
  const firstUpcomingDate = useMemo(() => {
    const now = new Date();
    const upcoming = allEvents.find((ev) => new Date(ev.start_at) >= now);
    return upcoming ? new Date(upcoming.start_at) : now;
  }, [allEvents]);

  const displayName = friendName || "Friend";

  /* ── sidebar props — mini calendar only, no child/friend filter toggles ── */
  const sidebarProps = {
    viewMonth,
    setViewMonth,
    eventsByDate,
    myChildren: [] as any[],
    enabledChildren: new Set<string>(),
    toggleChild: (_id: string) => {},
    friends: [] as any[],
    enabledFriends: new Set<string>(),
    toggleFriend: (_id: string) => {},
    childColorMap: new Map<string, any>(),
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
      {/* ── Back link ── */}
      <div className="mb-3">
        <Link
          href="/friends"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          My Friends
        </Link>
      </div>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {displayName}&apos;s Activities
        </h1>
      </div>

      {/* ── View controls ── */}
      <div className="flex items-center gap-2 sm:gap-3 mt-3 mb-4 overflow-x-auto">
        {/* List / Calendar toggle */}
        <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden text-sm shrink-0">
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

        {/* Agenda / Week / Month sub-tabs — calendar mode only */}
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

        {/* Mobile filter button */}
        {viewMode === "calendar" && (
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            aria-label="Open calendar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="hidden xs:inline">Calendar</span>
          </button>
        )}

        {/* Today + month nav */}
        {viewMode === "calendar" && (
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-foreground hover:bg-accent transition-colors mr-1 sm:mr-2"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full hover:bg-accent h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Previous"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground text-center animate-pulse">
          Loading activities...
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="rounded-2xl bg-card p-6 text-sm text-destructive">{error}</div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <div className="flex gap-6">
          {/* Desktop sidebar (mini calendar) */}
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
                events={listEvents}
                loading={false}
                error={null}
                mode="list"
              />
            )}

            {/* Calendar agenda */}
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
                  onDateClick={(_dateStr: string) => {
                    if (window.innerWidth < 640) setCalendarTab("agenda");
                  }}
                  onMonthChange={(d: Date) => {
                    const next = monthStart(d);
                    setViewMonth((prev) =>
                      prev.getTime() === next.getTime() ? prev : next
                    );
                  }}
                />
              )}

            {/* Empty state */}
            {allEvents.length === 0 && (
              <div className="rounded-2xl bg-card p-6 sm:p-8 text-center mt-4">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-muted-foreground">
                  No upcoming activities on {displayName}&apos;s calendar yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile mini-calendar bottom sheet ── */}
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
                <h2 className="text-sm font-semibold text-foreground">Mini Calendar</h2>
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
              {/* content */}
              <div className="p-4">
                <CalendarSidebar {...sidebarProps} />
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
