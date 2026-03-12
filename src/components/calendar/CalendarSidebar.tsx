"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/hooks/useMyCalendar";

/* ── types ── */

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  avatar_emoji: string | null;
};

type FriendProfile = {
  id: string;
  name: string;
  children: Child[];
};

type ChildColor = {
  bg: string;
  text: string;
  dot: string;
  hex: string;
};

type Props = {
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
  myChildren: Child[];
  enabledChildren: Set<string>;
  toggleChild: (id: string) => void;
  friends: FriendProfile[];
  enabledFriends: Set<string>;
  toggleFriend: (id: string) => void;
  childColorMap: Map<string, ChildColor>;
};

/* ── helpers ── */

const pad2 = (n: number) => String(n).padStart(2, "0");
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const FRIEND_COLORS = [
  { dot: "bg-teal-500", hex: "#14b8a6" },
  { dot: "bg-indigo-500", hex: "#6366f1" },
  { dot: "bg-pink-500", hex: "#ec4899" },
  { dot: "bg-lime-500", hex: "#84cc16" },
];

/* ── component ── */

export function CalendarSidebar({
  viewMonth,
  setViewMonth,
  eventsByDate,
  myChildren,
  enabledChildren,
  toggleChild,
  friends,
  enabledFriends,
  toggleFriend,
  childColorMap,
}: Props) {
  const [sharedExpanded, setSharedExpanded] = useState(true);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayObj = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  /* Mini month grid cells */
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`b-${i}`} className="h-7" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = ymdLocal(d);
    const hasEvents = !!(eventsByDate[key]?.length);
    const isToday =
      d.getFullYear() === todayObj.getFullYear() &&
      d.getMonth() === todayObj.getMonth() &&
      d.getDate() === todayObj.getDate();

    cells.push(
      <button
        key={day}
        type="button"
        className={`relative h-7 w-7 mx-auto flex items-center justify-center rounded-full text-[11px] transition-colors ${
          isToday
            ? "bg-primary text-primary-foreground font-bold"
            : "text-foreground hover:bg-accent"
        }`}
        onClick={() => {
          const target = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {day}
        {hasEvents && (
          <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isToday ? "bg-primary-foreground" : "bg-primary"}`} />
        )}
      </button>
    );
  }

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <aside className="space-y-5">
      {/* ── Mini month calendar ── */}
      <div className="bg-card rounded-xl border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
              aria-label="Previous month"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
              aria-label="Next month"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-[10px] font-medium text-muted-foreground mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">{cells}</div>
      </div>

      {/* ── My Calendar (children) ── */}
      <div className="bg-card rounded-xl border border-border p-3">
        <h3 className="text-xs font-semibold text-foreground mb-2">My Calendar</h3>
        {myChildren.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No children added yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {myChildren.map((child) => {
              const color = childColorMap.get(child.id);
              const enabled = enabledChildren.has(child.id);
              const displayName = child.preferred_name?.trim() || child.legal_name;
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => toggleChild(child.id)}
                    className="flex items-center gap-2 w-full group text-left"
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center transition-colors ${
                        enabled
                          ? "border-transparent"
                          : "border-muted-foreground/30 bg-transparent"
                      }`}
                      style={enabled ? { backgroundColor: color?.hex || "#f97316" } : undefined}
                    >
                      {enabled && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">
                      {child.avatar_emoji && <span className="mr-1">{child.avatar_emoji}</span>}
                      {displayName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Shared Calendars (friends) ── */}
      {friends.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3">
          <button
            type="button"
            onClick={() => setSharedExpanded((p) => !p)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h3 className="text-xs font-semibold text-foreground">Shared Calendars</h3>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-muted-foreground transition-transform ${sharedExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {sharedExpanded && (
            <ul className="space-y-1.5">
              {friends.map((friend, fi) => {
                const enabled = enabledFriends.has(friend.id);
                const color = FRIEND_COLORS[fi % FRIEND_COLORS.length];
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => toggleFriend(friend.id)}
                      className="flex items-center gap-2 w-full group text-left"
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center transition-colors ${
                          enabled
                            ? "border-transparent"
                            : "border-muted-foreground/30 bg-transparent"
                        }`}
                        style={enabled ? { backgroundColor: color.hex } : undefined}
                      >
                        {enabled && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {friend.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
