// src/pages/CalendarsPage.tsx
import React, { useState } from "react";
import { Container } from "../components/layout/Container";
import { useMyCalendar } from "../hooks/useMyCalendar";
import { CalendarEventList } from "../components/calendar/CalendarEventList";
import { CalendarMonthGrid } from "../components/calendar/CalendarMonthGrid";
import { CalendarTabs } from "../components/calendar/CalendarTabs";
import { SharedCalendarList } from "../components/calendar/SharedCalendarList";
import type { SharedCalendar } from "../components/calendar/SharedCalendarList";
import { CalendarShareModal } from "../components/calendar/CalendarShareModal";

type CalendarTab = "my" | "shared";

export const CalendarsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalendarTab>("my");
  const [shareOpen, setShareOpen] = useState(false);

  const {
    events,
    loading,
    error,
    viewMonth,
    setViewMonth,
    eventsByDate,
  } = useMyCalendar();

  // TODO: wire to Supabase later
  const sharedCalendars: SharedCalendar[] = [];

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-10">
        {/* Title + share button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Calendars
          </h1>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Share my calendar
          </button>
        </div>

        <CalendarTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "my" && (
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-8">
              <div>
                <CalendarEventList
                  events={events}
                  loading={loading}
                  error={error}
                />
              </div>

              <CalendarMonthGrid
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                eventsByDate={eventsByDate}
              />
            </div>
          </section>
        )}

        {activeTab === "shared" && (
          <section>
            <SharedCalendarList calendars={sharedCalendars} />
          </section>
        )}
      </Container>

      {shareOpen && (
        <CalendarShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
};

export default CalendarsPage;
