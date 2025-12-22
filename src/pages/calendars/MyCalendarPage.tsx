import React, { useMemo, useState } from "react";
import { useMyCalendar } from "../../hooks/useMyCalendar";
import { CalendarEventList } from "../../components/calendar/CalendarEventList";
import { CalendarMonthGrid } from "../../components/calendar/CalendarMonthGrid";
import { Button } from "../../components/ui/Button";
import ShareCalendarModal from "../../components/calendar/ShareCalendarModal";

export const MyCalendarPage: React.FC = () => {
  const { events, loading, error, viewMonth, setViewMonth, eventsByDate } = useMyCalendar();
  const [shareOpen, setShareOpen] = useState(false);

  const nextEvent = useMemo(() => {
    if (!events.length) return null;
    const now = Date.now();
    const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
    return sorted.find((e) => new Date(e.start_at).getTime() >= now) ?? sorted[0];
  }, [events]);

  const jumpToNext = () => {
    if (!nextEvent) return;
    const key = new Date(nextEvent.start_at).toISOString().slice(0, 10);
    const el = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Calendars</h1>
          <Button variant="outline" onClick={jumpToNext} disabled={!nextEvent || loading}>
            Jump to next
          </Button>
        </div>

        <Button variant="primary" onClick={() => setShareOpen(true)}>
          Share my calendar
        </Button>
      </div>

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

      <ShareCalendarModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </section>
  );
};

export default MyCalendarPage;
