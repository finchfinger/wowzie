"use client";

import { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

/* ── types ── */

type FCEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: Record<string, any>;
};

type Props = {
  events: FCEvent[];
  viewMonth: Date;
  calendarTab: "month" | "week";
  onDateClick?: (dateStr: string) => void;
  onMonthChange?: (date: Date) => void;
};

/* ── component ── */

export function FullCalendarView({
  events,
  viewMonth,
  calendarTab,
  onDateClick,
  onMonthChange,
}: Props) {
  const calRef = useRef<FullCalendar>(null);

  /* keep FullCalendar in sync with external viewMonth / calendarTab */
  useEffect(() => {
    const api = calRef.current?.getApi();
    if (!api) return;
    const target = calendarTab === "week" ? "timeGridWeek" : "dayGridMonth";
    if (api.view.type !== target) api.changeView(target);
    api.gotoDate(viewMonth);
  }, [viewMonth, calendarTab]);

  return (
    <div className="golly-fc rounded-xl border border-border bg-card overflow-hidden">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={calendarTab === "week" ? "timeGridWeek" : "dayGridMonth"}
        initialDate={viewMonth}
        headerToolbar={false}
        events={events}
        height="auto"
        dayMaxEvents={3}
        eventDisplay="block"
        dateClick={(info) => onDateClick?.(info.dateStr)}
        datesSet={(info) => onMonthChange?.(info.start)}
        eventClassNames="!rounded-md !text-[11px] !font-medium !border-0 !px-1.5 !py-0.5 !leading-tight"
        dayCellClassNames="!border-border"
        dayHeaderClassNames="!text-xs !font-medium !text-muted-foreground !border-border !py-2"
        moreLinkClassNames="!text-xs !text-primary !font-medium"
        nowIndicatorClassNames="!bg-primary"
        viewClassNames="!border-0"
      />
    </div>
  );
}
