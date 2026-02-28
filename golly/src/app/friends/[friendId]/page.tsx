"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useMyCalendar } from "@/hooks/useMyCalendar";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CalendarEventList } from "@/components/calendar/CalendarEventList";

type ViewMode = "list" | "calendar";

export default function FriendActivitiesPage() {
  const { friendId } = useParams<{ friendId: string }>();

  const [friendName, setFriendName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { events, loading, error, viewMonth, setViewMonth, eventsByDate } =
    useMyCalendar(friendId);

  // Load friend's profile name
  useEffect(() => {
    if (!friendId) return;
    const loadName = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("legal_name, preferred_first_name")
        .eq("id", friendId)
        .maybeSingle();
      if (data) {
        const name =
          (data as any).preferred_first_name?.trim() ||
          (data as any).legal_name?.trim() ||
          null;
        setFriendName(name);
      }
    };
    void loadName();
  }, [friendId]);

  const displayName = friendName || "Friend";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/friends"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>&larr;</span> My Friends
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {displayName}&apos;s Activities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Camps and classes on {displayName}&apos;s calendar.
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex rounded-xl border border-border bg-card overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <CalendarEventList events={events} loading={loading} error={error} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-8">
          <CalendarEventList events={events} loading={loading} error={error} />
          <CalendarMonthGrid
            viewMonth={viewMonth}
            setViewMonth={setViewMonth}
            eventsByDate={eventsByDate}
          />
        </div>
      )}
    </main>
  );
}
