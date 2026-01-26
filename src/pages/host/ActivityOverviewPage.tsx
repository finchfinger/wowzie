// src/pages/host/ActivityOverviewPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Activity, ActivityOutletContext } from "./ActivityLayoutPage";
import { InfoRow } from "../../components/host/InfoRow";

// Simple emoji icons (swap later if you want)
const CalendarIcon = () => <span className="text-base">📅</span>;
const ClockIcon = () => <span className="text-base">⏰</span>;
const PriceIcon = () => <span className="text-base">$</span>;
const LocationIcon = () => <span className="text-base">📍</span>;
const PeopleIcon = () => <span className="text-base">👨‍👩‍👧‍👦</span>;
const LockIcon = () => <span className="text-base">🔒</span>;

function safeTimeZone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return undefined;
  }
}

function formatDate(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(d);
}

function formatTime(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function parseLocalTimeHHMMSS(value?: string | null): { h: number; m: number } | null {
  if (!value) return null;
  const parts = value.split(":").map((v) => Number(v));
  const h = parts[0];
  const m = parts[1] ?? 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function deriveDateRange(activity: Activity): { heading: string; value: string } {
  const tz = safeTimeZone(activity.schedule_tz);

  if (activity.start_time || activity.end_time) {
    const start = activity.start_time ? new Date(activity.start_time) : null;
    const end = activity.end_time ? new Date(activity.end_time) : null;

    if (start && end) {
      const startLabel = formatDate(start, tz);
      const endLabel = formatDate(end, tz);
      if (startLabel !== endLabel) return { heading: "Dates", value: `${startLabel} – ${endLabel}` };
      return { heading: "Date", value: startLabel };
    }

    if (start) return { heading: "Date", value: formatDate(start, tz) };
    if (end) return { heading: "Date", value: formatDate(end, tz) };
  }

  const fixed = activity.meta?.fixedSchedule || {};
  const startMeta = fixed.startDate as string | undefined;
  const endMeta = fixed.endDate as string | undefined;

  if (!startMeta && !endMeta) return { heading: "Date", value: "Date to be announced" };

  const start = startMeta ? new Date(startMeta) : null;
  const end = endMeta ? new Date(endMeta) : null;

  if (start && end) {
    const startLabel = formatDate(start, tz);
    const endLabel = formatDate(end, tz);
    if (startLabel !== endLabel) return { heading: "Dates", value: `${startLabel} – ${endLabel}` };
    return { heading: "Date", value: startLabel };
  }

  if (start) return { heading: "Date", value: formatDate(start, tz) };
  if (end) return { heading: "Date", value: formatDate(end, tz) };

  return { heading: "Date", value: "Date to be announced" };
}

function deriveTimeLabel(activity: Activity): string {
  const tz = safeTimeZone(activity.schedule_tz);

  const fixed = activity.meta?.fixedSchedule || {};
  const metaAllDay = Boolean(fixed.allDay);
  if (metaAllDay) return "All day";

  if (activity.start_time || activity.end_time) {
    const start = activity.start_time ? new Date(activity.start_time) : null;
    const end = activity.end_time ? new Date(activity.end_time) : null;

    if (start && end) return `${formatTime(start, tz)} – ${formatTime(end, tz)}`;
    if (start) return formatTime(start, tz);
    if (end) return formatTime(end, tz);
  }

  const sLocal = parseLocalTimeHHMMSS(activity.start_local);
  const eLocal = parseLocalTimeHHMMSS(activity.end_local);

  if (sLocal || eLocal) {
    const start = new Date();
    const end = new Date();
    if (sLocal) start.setHours(sLocal.h, sLocal.m, 0, 0);
    if (eLocal) end.setHours(eLocal.h, eLocal.m, 0, 0);

    if (sLocal && eLocal) return `${formatTime(start)} – ${formatTime(end)}`;
    if (sLocal) return formatTime(start);
    if (eLocal) return formatTime(end);
  }

  const startMeta = fixed.startTime as string | undefined;
  const endMeta = fixed.endTime as string | undefined;

  if (!startMeta && !endMeta) return "Time to be announced";

  const toPretty = (value?: string) => {
    if (!value) return "";
    const [h, m] = value.split(":").map((v) => Number(v));
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return formatTime(d);
  };

  if (startMeta && endMeta) return `${toPretty(startMeta)} – ${toPretty(endMeta)}`;
  return toPretty(startMeta || endMeta);
}

function formatPrice(activity: Activity): string {
  if (typeof activity.price_cents === "number") {
    const dollars = activity.price_cents / 100;
    return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return "$—";
}

function formatListingType(activity: Activity): string {
  const visibility = activity.meta?.visibility as "public" | "private" | undefined;
  if (visibility === "public") return "Public";
  if (visibility === "private") return "Private";
  return activity.is_published ? "Public" : "Private";
}

export const ActivityOverviewPage: React.FC = () => {
  const { activity, loading, error } = useOutletContext<ActivityOutletContext>();
  const [registrations, setRegistrations] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    const loadRegistrations = async () => {
      if (!activity?.id) return;

      const { count, error: countErr } = await supabase
        .from("camp_bookings")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", activity.id)
        .neq("status", "declined");

      if (!alive) return;

      if (countErr) {
        console.error("camp_bookings count error:", countErr);
        setRegistrations(0);
      } else {
        setRegistrations(count ?? 0);
      }
    };

    void loadRegistrations();

    return () => {
      alive = false;
    };
  }, [activity?.id]);

  const dateRange = useMemo(() => (activity ? deriveDateRange(activity) : null), [activity]);
  const timeValue = useMemo(
    () => (activity ? deriveTimeLabel(activity) : "Time to be announced"),
    [activity]
  );

  if (loading) return <p className="text-xs text-gray-500">Loading activity details…</p>;
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!activity) return <p className="text-xs text-red-600">No activity found for this id.</p>;

  const priceValue = formatPrice(activity);
  const listingType = formatListingType(activity);
  const location = activity.location || "Location to be announced";

  const capacity = typeof activity.capacity === "number" ? activity.capacity : null;
  const registrationsLabel = capacity != null ? `${registrations} of ${capacity}` : `${registrations}`;

  return (
    <section className="pt-2">
      <div className="grid gap-8 md:grid-cols-2 text-sm">
        <div className="space-y-4">
          <InfoRow
            icon={<CalendarIcon />}
            label={dateRange?.heading || "Date"}
            value={dateRange?.value || "Date to be announced"}
          />
          <InfoRow icon={<ClockIcon />} label="Time" value={timeValue} />
          <InfoRow icon={<PriceIcon />} label="Price per child" value={priceValue} />
        </div>

        <div className="space-y-4">
          <InfoRow icon={<LocationIcon />} label="Location" value={location} />
          <InfoRow icon={<PeopleIcon />} label="Registrations" value={registrationsLabel} />
          <InfoRow icon={<LockIcon />} label="Listing type" value={listingType} />
        </div>
      </div>
    </section>
  );
};

export default ActivityOverviewPage;
