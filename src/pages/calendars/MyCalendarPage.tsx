import React, { useEffect, useMemo, useRef } from "react";
import { useMyCalendar } from "../../hooks/useMyCalendar";
import { CalendarEventList } from "../../components/calendar/CalendarEventList";
import { CalendarMonthGrid } from "../../components/calendar/CalendarMonthGrid";

export const MyCalendarPage: React.FC = () => {
  const { events, loading, error, viewMonth, setViewMonth, eventsByDate } = useMyCalendar();

  const nextEvent = useMemo(() => {
    if (!events.length) return null;
    const now = Date.now();
    const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
    return sorted.find((e) => new Date(e.start_at).getTime() >= now) ?? sorted[0];
  }, [events]);

  const autoJumpedRef = useRef(false);

  const jumpToNext = () => {
    if (!nextEvent) return;

    const key = new Date(nextEvent.start_at).toISOString().slice(0, 10);
    const el = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Auto jump once after events load and the DOM has painted
  useEffect(() => {
    if (loading) return;
    if (!nextEvent) return;
    if (autoJumpedRef.current) return;

    autoJumpedRef.current = true;

    // Give React a tick to paint the month grid + event list
    window.setTimeout(() => {
      requestAnimationFrame(() => jumpToNext());
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, nextEvent]);

  return (
    <section className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-8">
        <div>
          <CalendarEventList events={events} loading={loading} error={error} />
        </div>

        <CalendarMonthGrid
          viewMonth={viewMonth}
          setViewMonth={setViewMonth}
          eventsByDate={eventsByDate}
        />
      </section>
    </section>
  );
};

export default MyCalendarPage;
