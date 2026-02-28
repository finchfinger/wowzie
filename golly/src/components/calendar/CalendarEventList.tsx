"use client";

import type { CalendarEvent } from "@/hooks/useMyCalendar";

type Props = {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, "0");

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function CalendarEventList({ events, loading, error }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading calendar...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!events.length) return <p className="text-sm text-muted-foreground">No upcoming camps on the calendar.</p>;

  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = ymdLocal(new Date(ev.start_at));
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const dateObj = new Date(`${dateKey}T00:00:00`);
        const label = formatDateLabel(dateObj);
        const longLabel = dateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) || dateKey;
        const dayEvents = groups[dateKey].slice().sort((a, b) => a.start_at.localeCompare(b.start_at));

        return (
          <section key={dateKey} data-day={dateKey} className="space-y-2">
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground/60">{longLabel}</span>
            </div>

            <div className="space-y-2">
              {dayEvents.map((ev) => {
                const start = new Date(ev.start_at);
                const end = new Date(ev.end_at);
                const timeRange = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} \u2013 ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

                return (
                  <article key={ev.id} className="bg-card rounded-xl ring-1 ring-border p-3 flex gap-3">
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {ev.camp.image_url ? (
                        <img src={ev.camp.image_url} alt={ev.camp.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{ev.camp.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{timeRange}</p>
                      {ev.camp.location && (
                        <p className="text-[11px] text-muted-foreground/70 truncate">{ev.camp.location}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
