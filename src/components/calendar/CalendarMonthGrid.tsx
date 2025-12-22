// src/components/calendar/CalendarMonthGrid.tsx
import React from "react";
import type { CalendarEvent } from "../../hooks/useMyCalendar";

type CalendarMonthGridProps = {
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
};

const today = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

const pad2 = (n: number) => String(n).padStart(2, "0");

// Local YYYY-MM-DD (matches useMyCalendar + CalendarEventList)
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

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  viewMonth,
  setViewMonth,
  eventsByDate,
}) => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: React.ReactNode[] = [];

  // leading blanks
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`blank-${year}-${month}-${i}`} className="h-8" />);
  }

  // days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = ymdLocal(d);
    const dayEvents = eventsByDate[key] || [];
    const hasEvents = dayEvents.length > 0;

    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    // Use a stable unique key per cell (month can change)
    const cellKey = `${year}-${month}-${day}`;

    cells.push(
      <button
        key={cellKey}
        type="button"
        className={`relative h-8 w-8 mx-auto flex items-center justify-center rounded-full text-[11px] ${
          isToday
            ? "bg-gray-900 text-white"
            : "text-gray-800 hover:bg-gray-100"
        }`}
        onClick={() => {
          const target = document.querySelector<HTMLElement>(
            `[data-day="${key}"]`
          );
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        aria-label={`${d.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}${hasEvents ? `, ${dayEvents.length} event(s)` : ""}`}
      >
        {day}
        {hasEvents && (
          <span
            className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
              isToday ? "bg-white" : "bg-emerald-500"
            }`}
          />
        )}
      </button>
    );
  }

  const label = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="text-sm font-medium text-gray-900">{label}</div>
      </div>

      <div className="grid grid-cols-7 text-[11px] font-medium text-gray-500 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d.key} className="text-center" aria-hidden="true">
            {d.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">{cells}</div>

      <p className="mt-3 text-[11px] text-gray-500">
        Days with a • dot have at least one camp or class.
      </p>
    </div>
  );
};

export default CalendarMonthGrid;
