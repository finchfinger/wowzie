"use client";

import type { CalendarEvent } from "@/hooks/useMyCalendar";

type Props = {
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function ymdLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const WEEKDAYS = [
  { key: "sun", label: "S" },
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
];

const today = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export function CalendarMonthGrid({ viewMonth, setViewMonth, eventsByDate }: Props) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`blank-${i}`} className="h-8" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = ymdLocal(d);
    const dayEvents = eventsByDate[key] || [];
    const hasEvents = dayEvents.length > 0;
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    cells.push(
      <button
        key={`${year}-${month}-${day}`}
        type="button"
        className={`relative h-8 w-8 mx-auto flex items-center justify-center rounded-full text-[11px] ${
          isToday
            ? "bg-foreground text-background"
            : "text-foreground hover:bg-accent"
        }`}
        onClick={() => {
          const target = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${hasEvents ? `, ${dayEvents.length} event(s)` : ""}`}
      >
        {day}
        {hasEvents && (
          <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isToday ? "bg-background" : "bg-primary"}`} />
        )}
      </button>
    );
  }

  const label = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
            aria-label="Previous month"
          >
            &#8249;
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
            aria-label="Next month"
          >
            &#8250;
          </button>
        </div>
        <div className="text-sm font-medium text-foreground">{label}</div>
      </div>

      <div className="grid grid-cols-7 text-[11px] font-medium text-muted-foreground mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d.key} className="text-center" aria-hidden="true">{d.label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">{cells}</div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Days with a &bull; dot have at least one camp or class.
      </p>
    </div>
  );
}
