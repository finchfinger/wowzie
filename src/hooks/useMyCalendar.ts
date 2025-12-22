// src/hooks/useMyCalendar.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export type CalendarCamp = {
  id: string;
  name: string;
  location?: string | null;
  image_url?: string | null;
  meta?: any | null; // legacy fallback parsing
};

export type CalendarEvent = {
  id: string; // booking id
  camp_id: string;
  start_at: string;
  end_at: string;
  camp: CalendarCamp;
  booking_status: string;
  guests_count: number;
};

export type UnscheduledBooking = {
  id: string; // booking id
  camp_id: string;
  camp: CalendarCamp;
  booking_status: string;
  guests_count: number;
};

type UseMyCalendarResult = {
  events: CalendarEvent[];
  unscheduled: UnscheduledBooking[];
  loading: boolean;
  error: string | null;
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
  nextEvent: CalendarEvent | null;
  jumpToNextEvent: () => void;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, "0");

// Local YYYY-MM-DD (avoid UTC shifting)
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Exported for UI components that import it.
 */
export function formatDateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - today.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Legacy fallback:
 * meta.fixedSchedule:
 * { startDate:"YYYY-MM-DD", startTime:"HH:mm", endDate:"YYYY-MM-DD", endTime:"HH:mm" }
 *
 * Uses browser local timezone.
 */
function deriveTimesFromFixedSchedule(meta: any | null | undefined): {
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

export function useMyCalendar(): UseMyCalendarResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(new Date()));

  // only auto-jump once per mount
  const [didAutoJump, setDidAutoJump] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Month range for filtering events shown in this view
      const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

      // Ensure we have a user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        console.error("calendar: no user", userErr);
        setError("Please sign in to view your calendar.");
        setEvents([]);
        setUnscheduled([]);
        setLoading(false);
        return;
      }

      const userId = userRes.user.id;

      // Pull my bookings + camp info
      const { data, error: qErr } = await supabase
        .from("bookings")
        .select(
          `
          id,
          camp_id,
          status,
          guests_count,
          camps:camp_id (
            id,
            name,
            location,
            image_url,
            start_time,
            end_time,
            meta
          )
        `
        )
        .eq("user_id", userId)
        .in("status", ["confirmed"])
        .order("created_at", { ascending: false });

      if (qErr) {
        console.error("calendar: bookings query error", qErr);
        setError("Could not load your calendar.");
        setEvents([]);
        setUnscheduled([]);
        setLoading(false);
        return;
      }

      const nextEvents: CalendarEvent[] = [];
      const nextUnscheduled: UnscheduledBooking[] = [];

      for (const row of (data || []) as any[]) {
        const campRow = row.camps;

        const camp: CalendarCamp = campRow
          ? {
              id: campRow.id,
              name: campRow.name,
              location: campRow.location,
              image_url: campRow.image_url,
              meta: campRow.meta,
            }
          : {
              id: row.camp_id,
              name: "Unknown camp",
              location: "",
              image_url: "",
              meta: null,
            };

        // canonical fields
        let startAt: string | null = campRow?.start_time ?? null;
        let endAt: string | null = campRow?.end_time ?? null;

        // legacy fallback
        if (!startAt) {
          const derived = deriveTimesFromFixedSchedule(campRow?.meta);
          startAt = derived.startAt;
          if (!endAt) endAt = derived.endAt;
        }

        if (!startAt) {
          nextUnscheduled.push({
            id: row.id,
            camp_id: row.camp_id,
            camp,
            booking_status: row.status,
            guests_count: row.guests_count,
          });
          continue;
        }

        const startDate = new Date(startAt);
        if (Number.isNaN(startDate.getTime())) {
          nextUnscheduled.push({
            id: row.id,
            camp_id: row.camp_id,
            camp,
            booking_status: row.status,
            guests_count: row.guests_count,
          });
          continue;
        }

        const computedEnd =
          endAt ||
          new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString();

        // filter to viewMonth for the grid/list
        if (!(startDate >= start && startDate < end)) continue;

        nextEvents.push({
          id: row.id,
          camp_id: row.camp_id,
          start_at: startAt,
          end_at: computedEnd,
          camp,
          booking_status: row.status,
          guests_count: row.guests_count,
        });
      }

      nextEvents.sort((a, b) => a.start_at.localeCompare(b.start_at));

      setEvents(nextEvents);
      setUnscheduled(nextUnscheduled);
      setLoading(false);
    };

    load();
  }, [viewMonth]);

  // For jumping, we need the next event across all bookings, not just the filtered month.
  // Easiest: derive it from current `events` when you’re already on the right month,
  // but we also want a jump even if this month has none.
  //
  // So: do a lightweight "nextEvent lookup" once, independent of viewMonth.
  const [nextEventGlobal, setNextEventGlobal] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const loadNext = async () => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) return;

      const userId = userRes.user.id;

      const { data, error: qErr } = await supabase
        .from("bookings")
        .select(
          `
          id,
          camp_id,
          status,
          guests_count,
          camps:camp_id (
            id,
            name,
            location,
            image_url,
            start_time,
            end_time,
            meta
          )
        `
        )
        .eq("user_id", userId)
        .in("status", ["confirmed"])
        .order("created_at", { ascending: false });

      if (qErr || !data) return;

      const now = new Date();

      // Build a list of dated events (no month filter), then pick earliest upcoming
      const allDated: CalendarEvent[] = [];

      for (const row of data as any[]) {
        const campRow = row.camps;

        const camp: CalendarCamp = campRow
          ? {
              id: campRow.id,
              name: campRow.name,
              location: campRow.location,
              image_url: campRow.image_url,
              meta: campRow.meta,
            }
          : {
              id: row.camp_id,
              name: "Unknown camp",
              location: "",
              image_url: "",
              meta: null,
            };

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
          new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString();

        allDated.push({
          id: row.id,
          camp_id: row.camp_id,
          start_at: startAt,
          end_at: computedEnd,
          camp,
          booking_status: row.status,
          guests_count: row.guests_count,
        });
      }

      allDated.sort((a, b) => a.start_at.localeCompare(b.start_at));

      const upcoming = allDated.find((e) => new Date(e.start_at) >= now) || null;
      setNextEventGlobal(upcoming || allDated[0] || null);
    };

    loadNext();
  }, []);

  const nextEvent = useMemo(() => nextEventGlobal, [nextEventGlobal]);

  const jumpToNextEvent = () => {
    if (!nextEvent) return;
    const d = new Date(nextEvent.start_at);
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    // also scroll list if it exists
    const key = ymdLocal(d);
    const target = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Auto-jump once when nextEvent is known
  useEffect(() => {
    if (didAutoJump) return;
    if (!nextEvent) return;

    const d = new Date(nextEvent.start_at);
    if (Number.isNaN(d.getTime())) return;

    const targetMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    if (
      viewMonth.getFullYear() !== targetMonth.getFullYear() ||
      viewMonth.getMonth() !== targetMonth.getMonth()
    ) {
      setViewMonth(targetMonth);
    }

    setDidAutoJump(true);
  }, [nextEvent, didAutoJump, viewMonth]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ymdLocal(new Date(ev.start_at));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    }
    return grouped;
  }, [events]);

  return {
    events,
    unscheduled,
    loading,
    error,
    viewMonth,
    setViewMonth,
    eventsByDate,
    nextEvent,
    jumpToNextEvent,
  };
}
