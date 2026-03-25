"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CalendarEvent } from "@/hooks/useMyCalendar";

type Props = {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  mode?: "list" | "agenda"; // list = flat + deduped, agenda = date-grouped
};

/* ── helpers ── */
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

function getStatusBadge(ev: CalendarEvent): { label: string; className: string } | null {
  if (ev.recurrenceLabel) {
    return { label: "Ongoing", className: "bg-emerald-100 text-emerald-700" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(ev.start_at);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.round((start.getTime() - today.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return null;
  if (diffDays === 0) return { label: "Today", className: "bg-emerald-100 text-emerald-700" };
  if (diffDays === 1) return { label: "Tomorrow", className: "bg-sky-100 text-sky-700" };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, className: "bg-violet-100 text-violet-700" };
  if (diffDays <= 14) return { label: "Next week", className: "bg-muted text-muted-foreground" };
  return null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/* ── ActivityRow ── extracted so it's easy to tweak independently ── */
export function ActivityRow({ ev }: { ev: CalendarEvent }) {
  const router = useRouter();
  const badge = getStatusBadge(ev);

  const subtitle = ev.recurrenceLabel
    ? ev.recurrenceLabel
    : (() => {
        const start = new Date(ev.start_at);
        const label = formatDateLabel(start);
        return `${label} at ${formatTime(ev.start_at)}`;
      })();

  return (
    <article
      onClick={() => router.push(`/bookings/${ev.id}`)}
      className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer select-none"
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0">
        {ev.camp.image_url ? (
          <Image src={ev.camp.image_url} alt={ev.camp.name} fill sizes="48px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl"></div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{ev.camp.name}</span>
          {badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        {ev.camp.location && (
          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{ev.camp.location}</p>
        )}
      </div>

      {/* Chevron */}
      <svg
        className="shrink-0 text-muted-foreground/40 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </article>
  );
}

/* ── CalendarEventList ── */
export function CalendarEventList({ events, loading, error, mode = "agenda" }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading calendar...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!events.length) return <p className="text-sm text-muted-foreground">No upcoming camps on the calendar.</p>;

  /* ── flat list mode ── */
  if (mode === "list") {
    return (
      <div className="space-y-2">
        {events.map((ev) => <ActivityRow key={ev.id} ev={ev} />)}
      </div>
    );
  }

  /* ── agenda mode: date-grouped ── */
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = ymdLocal(new Date(ev.start_at));
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="space-y-5">
      {sortedDates.map((dateKey) => {
        const dateObj = new Date(`${dateKey}T00:00:00`);
        const label = formatDateLabel(dateObj);
        const dayEvents = groups[dateKey].slice().sort((a, b) => a.start_at.localeCompare(b.start_at));

        return (
          <section key={dateKey} data-day={dateKey} className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="font-semibold text-foreground">{label}</span>
              <span className="text-muted-foreground/50">
                {dateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="space-y-2">
              {dayEvents.map((ev) => <ActivityRow key={ev.id} ev={ev} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
