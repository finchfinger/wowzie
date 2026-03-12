"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  firstUpcomingDate?: Date;
  onDateClick?: (dateStr: string) => void;
  onMonthChange?: (date: Date) => void;
};

/* ── component ── */

export function FullCalendarView({
  events,
  viewMonth,
  calendarTab,
  firstUpcomingDate,
  onDateClick,
  onMonthChange,
}: Props) {
  const calRef = useRef<FullCalendar>(null);
  const router = useRouter();

  /* keep FullCalendar in sync with external viewMonth / calendarTab */
  useEffect(() => {
    const api = calRef.current?.getApi();
    if (!api) return;
    const target = calendarTab === "week" ? "timeGridWeek" : "dayGridMonth";
    const switchingView = api.view.type !== target;
    if (switchingView) {
      api.changeView(target);
      if (calendarTab === "week") {
        api.gotoDate(firstUpcomingDate ?? new Date());
        return;
      }
    }
    api.gotoDate(viewMonth);
  }, [viewMonth, calendarTab, firstUpcomingDate]);

  return (
    <div className="wowzi-fc overflow-hidden rounded-xl bg-card border border-border/60">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={calendarTab === "week" ? "timeGridWeek" : "dayGridMonth"}
        initialDate={calendarTab === "week" ? (firstUpcomingDate ?? new Date()) : viewMonth}
        headerToolbar={false}
        events={events}
        height="auto"
        /* month view */
        fixedWeekCount={false}
        dayMaxEvents={3}
        /* week/time-grid view — no slotMinTime so 12am is reachable by scrolling */
        scrollTime="08:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        expandRows={true}
        nowIndicator={true}
        allDaySlot={false}
        /* shared */
        eventDisplay="block"
        dateClick={(info) => onDateClick?.(info.dateStr)}
        datesSet={(info) => onMonthChange?.(info.view.currentStart)}
        eventClick={(info) => {
          const slug = info.event.extendedProps?.slug as string | null;
          if (slug) router.push(`/camp/${slug}`);
        }}
        eventClassNames="!rounded-md !text-[11px] !font-medium !border-0 !px-1.5 !py-0.5 !leading-tight cursor-pointer"
        dayCellClassNames="!border-border"
        dayHeaderClassNames="!text-xs !font-medium !text-muted-foreground !border-border !py-2"
        moreLinkClassNames="!text-xs !text-primary !font-medium"
        nowIndicatorClassNames="!bg-primary"
        viewClassNames="!border-0"
        slotLabelClassNames="!text-[11px] !text-muted-foreground"
      />
    </div>
  );
}
