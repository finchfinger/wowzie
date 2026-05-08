"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCampFavorite } from "@/hooks/useCampFavorite";
import type { Camp } from "@/components/CampCard";
import { HostCard } from "@/components/HostCard";
import { CampDetailHeader } from "@/components/CampDetailHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthModal } from "@/components/auth/AuthModal";

/* ── Types ── */

type FullCamp = Camp & {
  location?: string | null;
  location_city?: string | null;
  location_neighborhood?: string | null;
  host_id?: string | null;
  capacity?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  external_url?: string | null;
  featured?: boolean | null;
};

type UserBooking = { id: string; status: string };

type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name: string | null;
};

/* ── Helpers ── */

function formatDate(iso: string): { month: string; day: string; full: string } {
  // Append T12:00:00 to date-only strings so they parse as local noon, not UTC midnight
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  };
}

function formatDateRange(startIso: string | null | undefined, endIso: string | null | undefined): string | null {
  if (!startIso) return null;
  const s = new Date(startIso + "T12:00:00");
  const e = endIso ? new Date(endIso + "T12:00:00") : null;
  if (isNaN(s.getTime())) return null;
  const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!e || isNaN(e.getTime())) return sStr;
  const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${sStr} – ${eStr}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatTimeLocal(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ageBucketLabel(buckets: string[]): string {
  if (!buckets?.length || buckets.includes("all")) return "All ages";
  return buckets.map((b) => {
    if (b === "3-5") return "Ages 3–5";
    if (b === "6-8") return "Ages 6–8";
    if (b === "9-12") return "Ages 9–12";
    if (b === "13+") return "Ages 13+";
    return b;
  }).join(", ");
}

function levelLabel(levels: string[]): string {
  if (!levels?.length || levels.includes("all_levels")) return "All levels";
  return levels.map((l) => {
    if (l === "beginner") return "Beginner";
    if (l === "intermediate") return "Intermediate";
    if (l === "advanced") return "Advanced";
    return l;
  }).join(", ");
}

function frequencyLabel(freq: string): string {
  const map: Record<string, string> = {
    once_week: "Once a week",
    twice_week: "Twice a week",
    three_week: "Three times a week",
    multiple_week: "Multiple times a week",
    daily: "Daily",
    flexible: "Flexible",
  };
  return map[freq] || freq;
}

function parseAddonPriceCents(priceStr?: string): number {
  if (!priceStr) return 0;
  const match = priceStr.match(/\$?(\d+(?:\.\d{1,2})?)/);
  return match ? Math.round(parseFloat(match[1]) * 100) : 0;
}

const WEEK_ORDINALS = ["one", "two", "three", "four", "five", "six", "seven", "eight"];

/* ── Time slot helpers (ongoing classes) ── */
const DAY_FULL: Record<string, string> = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday",
};
const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type TimeSlot = { key: string; label: string; day: string; start: string; end: string };

function extractTimeSlots(meta: any): TimeSlot[] {
  const weekly: Record<string, any> =
    meta?.classSchedule?.weekly ?? meta?.weeklySchedule ?? {};
  const slots: TimeSlot[] = [];
  for (const dayKey of DAY_ORDER) {
    const val = weekly[dayKey];
    if (!val) continue;
    if (val.available !== false && Array.isArray(val.blocks)) {
      for (const b of val.blocks) {
        if (!b.start || !b.end) continue;
        slots.push({ key: `${dayKey}-${b.start}-${b.end}`, label: `${DAY_FULL[dayKey]} · ${formatTimeLocal(b.start)} – ${formatTimeLocal(b.end)}`, day: dayKey, start: b.start, end: b.end });
      }
    } else if (typeof val.start === "string" && typeof val.end === "string") {
      slots.push({ key: `${dayKey}-${val.start}-${val.end}`, label: `${DAY_FULL[dayKey]} · ${formatTimeLocal(val.start)} – ${formatTimeLocal(val.end)}`, day: dayKey, start: val.start, end: val.end });
    }
  }
  return slots;
}

function generateDaysByWeek(startIso: string, endIso: string) {
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T23:59:59");
  const weeks: Array<{ label: string; days: Array<{ dateStr: string; label: string }> }> = [];
  const current = new Date(start);
  let currentWeekMonday: string | null = null;

  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const monday = new Date(current);
      monday.setDate(current.getDate() - (dow - 1));
      const mondayStr = monday.toISOString().split("T")[0];

      if (mondayStr !== currentWeekMonday) {
        currentWeekMonday = mondayStr;
        const weekIndex = weeks.length;
        weeks.push({ label: `Week ${WEEK_ORDINALS[weekIndex] ?? weekIndex + 1}`, days: [] });
      }

      weeks[weeks.length - 1].days.push({
        dateStr: current.toISOString().split("T")[0],
        label: current.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return weeks;
}

/* ── Main page ── */

export default function CampDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const justFull = searchParams.get("full") === "1";
  const { user } = useAuth();

  const [camp, setCamp] = useState<FullCamp | null>(null);
  const [loadingCamp, setLoadingCamp] = useState(true);
  const [campError, setCampError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [booking, setBooking] = useState<UserBooking | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  const [hostProfile, setHostProfile] = useState<{
    preferred_first_name: string | null;
    legal_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // Time slots — derived from camp meta, computed here so it's above early returns
  const timeSlots = useMemo(() => extractTimeSlots(camp?.meta), [camp?.meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reservation state
  const [reservationGuests, setReservationGuests] = useState(1);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [addonsExpanded, setAddonsExpanded] = useState(false);
  const [earlyDropoffSelected, setEarlyDropoffSelected] = useState(false);
  const [extendedDaySelected, setExtendedDaySelected] = useState(false);
  const [earlyDropoffMode, setEarlyDropoffMode] = useState<"all" | "pick">("all");
  const [extendedDayMode, setExtendedDayMode] = useState<"all" | "pick">("all");
  const [earlyDropoffDays, setEarlyDropoffDays] = useState<Set<string>>(new Set());
  const [extendedDayDays, setExtendedDayDays] = useState<Set<string>>(new Set());
  const [pickDaysModal, setPickDaysModal] = useState<"earlyDropoff" | "extendedDay" | null>(null);
  const [pickDaysTemp, setPickDaysTemp] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareSending, setShareSending] = useState(false);
  const [shareSent, setShareSent] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<"favorite" | "message" | "booking" | "default">("default");
  const [pendingMessage, setPendingMessage] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [goingLoading, setGoingLoading] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  const { isFavorite, favoriteLoading, toggleFavorite } = useCampFavorite(camp?.id ?? null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoadingCamp(true);
      setCampError(null);
      const { data, error } = await supabase.from("camps")
        .select("id, slug, name, description, image_url, image_urls, hero_image_url, price_cents, price_unit, listing_type, schedule_days, meta, host_id, capacity, start_time, end_time, is_published, external_url, location, featured")
        .eq("slug", slug).maybeSingle();
      if (error || !data) { setCampError("We couldn't load this camp."); setLoadingCamp(false); return; }
      setCamp(data as FullCamp);
      setLoadingCamp(false);

      if ((data as FullCamp).host_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_first_name, legal_name, avatar_url")
          .eq("id", (data as FullCamp).host_id!)
          .maybeSingle();
        if (profile) setHostProfile(profile as any);
      }
    };
    void load();
  }, [slug]);

  useEffect(() => {
    if (!camp?.id) return;
    const loadBookingInfo = async () => {
      // Run all independent queries in parallel
      const [confirmedRes, bookingRes, reviewsRes, alreadyReviewedRes, externalRsvpRes] = await Promise.all([
        supabase
          .from("bookings").select("*", { count: "exact", head: true })
          .eq("camp_id", camp.id).eq("status", "confirmed"),
        user?.id
          ? supabase.from("bookings").select("id, status")
              .eq("camp_id", camp.id).eq("user_id", user.id)
              .order("created_at", { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from("reviews")
          .select("id, rating, body, created_at, reviewer_id")
          .eq("camp_id", camp.id).eq("is_published", true)
          .order("created_at", { ascending: false }).limit(20),
        user?.id
          ? supabase.from("reviews").select("id", { count: "exact", head: true })
              .eq("camp_id", camp.id).eq("reviewer_id", user.id)
          : Promise.resolve({ count: 0, error: null }),
        user?.id
          ? supabase.from("external_rsvps").select("id", { count: "exact", head: true })
              .eq("camp_id", camp.id).eq("user_id", user.id)
          : Promise.resolve({ count: 0, error: null }),
      ]);

      if (!confirmedRes.error) setConfirmedCount(confirmedRes.count ?? null);
      setBooking(bookingRes.data ? (bookingRes.data as UserBooking) : null);
      setIsGoing((externalRsvpRes.count ?? 0) > 0);

      // Load waitlist position if user is already waitlisted
      if (bookingRes.data && (bookingRes.data as UserBooking).status === "waitlisted") {
        const { count: wCount } = await supabase
          .from("bookings").select("*", { count: "exact", head: true })
          .eq("camp_id", camp.id).eq("status", "waitlisted");
        setWaitlistPosition(wCount ?? null);
      }

      // Reviewer profiles still depend on reviews result — one extra hop, unavoidable
      try {
        const reviewRows = reviewsRes.data;
        if (reviewRows && reviewRows.length > 0) {
          const reviewerIds = [...new Set((reviewRows as any[]).map((r) => r.reviewer_id))];
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, preferred_first_name, legal_name")
            .in("id", reviewerIds);
          const profileMap = new Map(
            ((profileRows ?? []) as any[]).map((p) => [
              p.id,
              (p.preferred_first_name?.trim() || p.legal_name?.trim()) ?? null,
            ])
          );
          setReviews(
            (reviewRows as any[]).map((r) => ({
              id: r.id,
              rating: r.rating,
              body: r.body ?? null,
              created_at: r.created_at,
              reviewer_id: r.reviewer_id,
              reviewer_name: profileMap.get(r.reviewer_id) ?? null,
            }))
          );
        }
        setAlreadyReviewed(("count" in alreadyReviewedRes ? (alreadyReviewedRes.count ?? 0) : 0) > 0);
      } catch {
        // reviews table may not exist yet — silently skip
      }
    };
    void loadBookingInfo();
  }, [camp?.id, user?.id]);

  // After sign-in, auto-trigger "Send a message" if it was pending
  useEffect(() => {
    if (pendingMessage && user) {
      setPendingMessage(false);
      void handleSendMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loadingCamp) {
    return (
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-10-center">
              <div className="grid gap-10 lg:grid-cols-[5fr_8fr] items-start animate-pulse">
                <div className="aspect-square rounded-3xl bg-muted" />
                <div className="space-y-4">
                  <div className="h-8 w-3/4 rounded-xl bg-muted" />
                  <div className="h-4 w-1/2 rounded-lg bg-muted" />
                  <div className="h-32 rounded-card bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (campError || !camp) {
    return (
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-10-center">
              <button type="button" className="mb-4 text-xs text-muted-foreground hover:text-foreground" onClick={() => router.back()}>← Back</button>
              <div className="rounded-card bg-card px-6 py-8">
                <p className="text-sm text-destructive">{campError || "We couldn't find that camp."}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { id, name, description, image_urls, image_url, hero_image_url, price_cents, meta, location_city, location_neighborhood, host_id, capacity, start_time, end_time } = camp;

  // Images
  const imageCandidates: string[] = [];
  if (hero_image_url) imageCandidates.push(hero_image_url);
  if (image_urls?.length) imageCandidates.push(...(image_urls.filter(Boolean) as string[]));
  if (image_url) imageCandidates.push(image_url);
  const images = imageCandidates.length > 0 ? imageCandidates : ["https://placehold.co/800x800?text=No+photo"];

  // Price
  const price = Number.isInteger(price_cents) ? `$${((price_cents || 0) / 100).toFixed(0)}` : null;
  const pricingMeta = meta?.pricing as { display?: string } | undefined;
  const rawDisplay = pricingMeta?.display || price;
  const priceDisplay = rawDisplay
    ? rawDisplay.startsWith("$") ? rawDisplay : `$${rawDisplay}`
    : null;

  // Host
  const orgName = meta?.organizationName as string | undefined;
  const orgSlug = meta?.organizationSlug as string | undefined;
  const hostName = orgName || hostProfile?.preferred_first_name || hostProfile?.legal_name || (meta?.host_name as string | undefined) || "Wowzi Host";
  const hostInitial = hostName.charAt(0).toUpperCase();

  // Dates
  const startDate = start_time ? formatDate(start_time) : null;
  const dateLabel = startDate
    ? startDate.full
    : (meta?.dateLabel as string | undefined) || null;

  const timeLabel = (() => {
    const fixed = meta?.fixedSchedule as { startTime?: string; endTime?: string; allDay?: boolean } | undefined;
    if (fixed?.allDay) return "All day";
    if (fixed?.startTime && fixed?.endTime) return `${formatTimeLocal(fixed.startTime)} – ${formatTimeLocal(fixed.endTime)}`;
    if (start_time && end_time) return `${formatTime(start_time)} – ${formatTime(end_time)}`;
    if (start_time) return formatTime(start_time);
    return null;
  })();

  // Location
  const isVirtual = meta?.isVirtual as boolean | undefined;
  const locationVenueName = (meta?.locationName as string | undefined) || null;
  const locationCityState = [location_neighborhood, location_city].filter(Boolean).join(", ")
    || (camp as any).location as string | null
    || null;
  const locationLine = isVirtual ? "Online event" : locationCityState;

  // Meta fields
  const category = meta?.category as string | undefined;
  const ageBuckets = (meta?.age_buckets as string[] | undefined) || [];
  const minAge = meta?.min_age as number | undefined;
  const maxAge = meta?.max_age as number | undefined;
  const experienceLevels = (meta?.experienceLevel as string[] | undefined) || [];
  const activityKind = meta?.activityKind as "camp" | "class" | undefined;
  const cancellationPolicy = meta?.cancellation_policy as string | undefined;
  const additionalDetails = meta?.additionalDetails as string | undefined;
  const advanced = meta?.advanced as {
    earlyDropoff?: { enabled: boolean; price?: string; start?: string; end?: string };
    extendedDay?: { enabled: boolean; price?: string; start?: string; end?: string };
    siblingDiscount?: { enabled: boolean; type?: string; value?: string };
  } | undefined;

  const classSchedule = meta?.classSchedule as {
    frequency?: string;
    duration?: string;
    studentsPerClass?: string;
    sessionLength?: string;
    sessionStartDate?: string;
    weekly?: Record<string, { available?: boolean; blocks?: { start: string; end: string }[] }>;
  } | undefined;

  // Appointment model: ongoing class with selectable time slots
  const isAppointmentClass = activityKind === "class" && timeSlots.length > 0;

  // Compute first class date for ongoing recurring classes
  const firstClassDate = (() => {
    if (activityKind !== "class" || !classSchedule?.weekly) return null;
    const DAY_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const base = new Date();
    if (classSchedule.sessionStartDate) {
      const sd = new Date(classSchedule.sessionStartDate);
      if (sd > base) { base.setTime(sd.getTime()); }
    }
    base.setHours(0, 0, 0, 0);
    let earliest: Date | null = null;
    for (const [dayKey, sched] of Object.entries(classSchedule.weekly)) {
      if (!sched?.available) continue;
      const dow = DAY_NUM[dayKey];
      if (dow === undefined) continue;
      const daysUntil = (dow - base.getDay() + 7) % 7;
      const occ = new Date(base);
      occ.setDate(occ.getDate() + daysUntil);
      if (!earliest || occ < earliest) earliest = occ;
    }
    return earliest;
  })();

  const campSessions = meta?.campSessions as Array<{
    id: string; label?: string; startDate: string; endDate: string;
    days?: string[];
    startTime: string; endTime: string; capacity: string;
    enableWaitlist?: boolean;
  }> | undefined;

  // True when all sessions share the same date range — time is the distinguishing factor
  const sessionsShareDates = !!campSessions && campSessions.length > 1 &&
    campSessions.every((s) => s.startDate === campSessions[0].startDate && s.endDate === campSessions[0].endDate);

  const enableWaitlist: boolean =
    campSessions?.[0]?.enableWaitlist ??
    (meta?.enableWaitlist as boolean | undefined) ??
    false;

  const campActivities = (meta?.activities as Array<{
    id: string; title: string; description: string;
  }> | undefined)?.filter((a) => a.title || a.description);

  // Age label
  const ageLabel = (() => {
    if (minAge != null && maxAge != null) return `Ages ${minAge}–${maxAge}`;
    if (minAge != null) return `Ages ${minAge}+`;
    if (ageBuckets.length) return ageBucketLabel(ageBuckets);
    return null;
  })();

  // Reviews
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Booking state
  const isHost = user?.id && host_id ? user.id === host_id : false;
  const now = new Date();
  const parsedEnd = end_time ? new Date(end_time) : start_time ? new Date(start_time) : null;
  const hasEnded = parsedEnd ? parsedEnd < now : false;
  const confirmed = typeof confirmedCount === "number" ? confirmedCount : 0;
  const totalCapacity = typeof capacity === "number" && capacity > 0 ? capacity : null;
  const isFull = totalCapacity != null ? confirmed >= totalCapacity : false;

  let statusVariant: "booked" | "full" | "ended" | "waitlisted" | null = null;
  if (hasEnded) statusVariant = "ended";
  else if (booking?.status === "confirmed") statusVariant = "booked";
  else if (booking?.status === "waitlisted") statusVariant = "waitlisted";
  else if (isFull) statusVariant = "full";

  const spotsLeft = totalCapacity != null ? totalCapacity - confirmed : null;

  // Days by week for pick-days modal — use selected sessions' date ranges when available
  const daysByWeek = (() => {
    if (campSessions && campSessions.length > 0) {
      if (selectedSessionIds.size > 0) {
        const selected = campSessions.filter((s) => selectedSessionIds.has(s.id));
        return selected.flatMap((s) => generateDaysByWeek(s.startDate, s.endDate));
      }
      return []; // no session picked yet
    }
    if (!start_time || !end_time) return [];
    return generateDaysByWeek(start_time.split("T")[0], end_time.split("T")[0]);
  })();
  const totalCampDays = daysByWeek.reduce((sum, w) => sum + w.days.length, 0);

  const hasAddons = !!(
    (!isAppointmentClass && advanced?.earlyDropoff?.enabled && advanced?.earlyDropoff?.price) ||
    (!isAppointmentClass && advanced?.extendedDay?.enabled && advanced?.extendedDay?.price) ||
    (advanced?.siblingDiscount?.enabled && advanced?.siblingDiscount?.value)
  );

  // Add-on cost helpers
  const earlyDropoffPriceCents = parseAddonPriceCents(advanced?.earlyDropoff?.price);
  const extendedDayPriceCents = parseAddonPriceCents(advanced?.extendedDay?.price);

  function getAddonDayCount(mode: "all" | "pick", selectedDays: Set<string>) {
    return mode === "all" ? totalCampDays : selectedDays.size;
  }

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(0)}`;
  }

  // Pick days modal helpers
  function openPickDays(type: "earlyDropoff" | "extendedDay") {
    const current = type === "earlyDropoff" ? earlyDropoffDays : extendedDayDays;
    setPickDaysTemp(new Set(current));
    setPickDaysModal(type);
  }

  function applyPickDays() {
    if (pickDaysModal === "earlyDropoff") setEarlyDropoffDays(new Set(pickDaysTemp));
    else if (pickDaysModal === "extendedDay") setExtendedDayDays(new Set(pickDaysTemp));
    setPickDaysModal(null);
  }

  function togglePickDay(dateStr: string) {
    const next = new Set(pickDaysTemp);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    setPickDaysTemp(next);
  }

  function setWeekSelection(weekDays: { dateStr: string }[], select: boolean) {
    const next = new Set(pickDaysTemp);
    weekDays.forEach((d) => { if (select) next.add(d.dateStr); else next.delete(d.dateStr); });
    setPickDaysTemp(next);
  }

  // "I'm going" toggle for external listings
  const handleToggleGoing = async () => {
    if (!user) {
      setAuthReason("default");
      setAuthOpen(true);
      return;
    }
    setGoingLoading(true);
    try {
      if (isGoing) {
        await supabase
          .from("external_rsvps")
          .delete()
          .eq("camp_id", id)
          .eq("user_id", user.id);
        setIsGoing(false);
      } else {
        await supabase
          .from("external_rsvps")
          .insert({ camp_id: id, user_id: user.id });
        setIsGoing(true);
      }
    } finally {
      setGoingLoading(false);
    }
  };

  // Share
  function handleShare() {
    setShareOpen(true);
  }

  function handleCopyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  // Send a message → use edge function to find-or-create conversation (bypasses RLS)
  async function handleSendMessage() {
    if (!host_id) return;
    if (!user) {
      const subject = encodeURIComponent(`Question about ${name ?? "an activity"}`);
      window.location.href = `mailto:hey@heywowzie.com?subject=${subject}`;
      return;
    }

    try {
      const { data: convData, error: fnErr } = await supabase.functions.invoke(
        "get-or-create-conversation",
        { body: { to_profile_id: host_id } }
      );
      if (fnErr) throw fnErr;
      // Function returns { ok, conversation: { id, ... } } or { conversation_id } depending on version
      const convId = convData?.conversation?.id ?? convData?.conversation_id ?? null;
      if (convId) {
        router.push(`/messages?c=${encodeURIComponent(convId)}`);
      } else {
        router.push(`/messages?to=${encodeURIComponent(host_id)}`);
      }
    } catch (err: any) {
      console.error("[handleSendMessage]", err?.message);
      router.push(`/messages?to=${encodeURIComponent(host_id)}`);
    }
  }

  // Running total
  const baseCents = price_cents ?? 0;
  const earlyDropoffAddonTotal = earlyDropoffSelected
    ? earlyDropoffPriceCents * getAddonDayCount(earlyDropoffMode, earlyDropoffDays)
    : 0;
  const extendedDayAddonTotal = extendedDaySelected
    ? extendedDayPriceCents * getAddonDayCount(extendedDayMode, extendedDayDays)
    : 0;
  const totalCents = baseCents * reservationGuests + earlyDropoffAddonTotal + extendedDayAddonTotal;
  const showTotal = baseCents > 0 && (reservationGuests > 1 || earlyDropoffAddonTotal > 0 || extendedDayAddonTotal > 0);

  // Show session card picker whenever there are multiple sessions (camp or class)
  const isMultiSlotClass = campSessions && campSessions.length > 1;
  const visibleSlots = isMultiSlotClass ? (showAllSlots ? campSessions : campSessions!.slice(0, 3)) : null;

  function toggleSession(id: string) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main>
      <div className="page-container pb-8">
        <div className="page-grid">
          <div className="span-10-center">


        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[5fr_8fr] items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4">

            {/* Main image */}
            <div className="relative overflow-hidden bg-muted aspect-square" style={{ borderRadius: 12 }}>
              <Image
                src={images[selectedIdx]}
                alt={name}
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-cover cursor-zoom-in"
                onClick={() => { setLightboxIdx(selectedIdx); setLightboxOpen(true); }}
                priority
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white transition-colors"
                  aria-label="Share"
                >
                  {shareCopied
                    ? <span className="text-[10px] font-semibold text-foreground">✓</span>
                    : <span className="material-symbols-rounded select-none text-foreground" style={{ fontSize: 16 }} aria-hidden>share</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { setAuthReason("favorite"); setAuthOpen(true); return; }
                    toggleFavorite();
                  }}
                  disabled={favoriteLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white transition-colors disabled:opacity-60"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <span className={`material-symbols-rounded select-none ${isFavorite ? "text-red-500" : "text-foreground"}`} style={{ fontSize: 16, fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }} aria-hidden>favorite</span>
                </button>
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button key={i} type="button" onClick={() => setSelectedIdx(i)}
                    className={`relative flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden border-2 transition-colors ${i === selectedIdx ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                  >
                    <Image src={src} alt={`Photo ${i + 1}`} fill sizes="56px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Host card */}
            <HostCard
              hostName={hostName}
              hostAvatarUrl={hostProfile?.avatar_url}
              isOwner={isHost}
              onMessage={handleSendMessage}
              onEdit={() => router.push(`/host/activities/${id}/edit`)}
              externalUrl={camp.external_url ?? null}
              orgSlug={orgSlug ?? null}
            />

            {/* Tags */}
            {(category || ageLabel || activityKind) && (
              <div className="flex flex-wrap gap-2">
                {activityKind && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                    {activityKind}
                  </span>
                )}
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: 12 }} aria-hidden>label</span> {category}
                  </span>
                )}
                {experienceLevels.length > 0 && !experienceLevels.includes("all_levels") && (
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    {levelLabel(experienceLevels)}
                  </span>
                )}
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            <CampDetailHeader
              name={name}
              isFeatured={!!camp.featured}
              activityKind={activityKind}
              isFavorite={isFavorite}
              onFavorite={() => {
                if (!user) { setAuthReason("favorite"); setAuthOpen(true); return; }
                toggleFavorite();
              }}
              onMessage={handleSendMessage}
              onShare={handleShare}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              locationVenueName={locationVenueName}
              locationLine={locationLine}
              isVirtual={!!isVirtual}
              ageLabel={ageLabel}
              priceLabel={priceDisplay ?? undefined}
            />

            {/* ── External partner CTA ── */}
            {camp.external_url && (() => {
              const selectedSession = campSessions?.find(s => selectedSessionIds.has(s.id)) ?? null;
              const sessionPriceCents = (selectedSession as any)?.priceCents as number | undefined;
              const displayPrice = sessionPriceCents
                ? `$${Math.round(sessionPriceCents / 100)}`
                : priceDisplay;
              return (
                <div className="rounded-card bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Registration</p>
                  </div>
                  <div className="px-5 py-4 space-y-4">

                    {/* External booking banner */}
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-lime-100 px-4 py-3">
                      <span className="material-symbols-rounded select-none text-lime-700 shrink-0" style={{ fontSize: 18 }}>storefront</span>
                      <p className="text-sm font-medium text-lime-800">
                        Booking is handled on{" "}
                        <a
                          href={camp.external_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          {orgName ?? name}&apos;s website
                        </a>
                      </p>
                    </div>

                    {/* Session/option picker */}
                    {campSessions && campSessions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Choose your program</p>
                        {campSessions.map((session) => {
                          const isSelected = selectedSessionIds.has(session.id);
                          const sPriceCents = (session as any).priceCents as number | undefined;
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedSessionIds(new Set([session.id]))}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30 hover:bg-muted/40"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{session.label}</p>
                                  {session.startTime && session.endTime && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatTimeLocal(session.startTime)} – {formatTimeLocal(session.endTime)}
                                    </p>
                                  )}
                                </div>
                                {sPriceCents != null && (
                                  <p className="shrink-0 text-sm font-semibold text-foreground">
                                    ${Math.round(sPriceCents / 100)}<span className="text-xs font-normal text-muted-foreground">/wk</span>
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fallback price when no sessions */}
                    {(!campSessions || campSessions.length === 0) && displayPrice && (
                      <div>
                        <p className="text-xl font-bold text-foreground">{displayPrice}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">per week</p>
                      </div>
                    )}

                    {/* Selected price summary */}
                    {selectedSession && displayPrice && (
                      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                        <p className="text-sm text-muted-foreground">{selectedSession.label}</p>
                        <p className="text-sm font-semibold text-foreground">{displayPrice}<span className="text-xs font-normal text-muted-foreground">/wk</span></p>
                      </div>
                    )}

                    {/* Primary actions */}
                    <div className="flex gap-3">
                      <a
                        href={camp.external_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
                      >
                        Register on their website
                      </a>
                      <button
                        type="button"
                        onClick={handleToggleGoing}
                        disabled={goingLoading}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                          isGoing
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        <span className={isGoing ? "" : "underline underline-offset-2"}>
                          {isGoing ? "Going ✓" : "I'm going"}
                        </span>
                      </button>
                    </div>

                    {/* Soft secondary link */}
                    <button
                      type="button"
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Explore similar events
                    </button>

                  </div>
                </div>
              );
            })()}

            {/* ── Reservation card ── */}
            {!camp.external_url && (
            <div className="rounded-card bg-card overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Reservation</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Price + spots */}
                {priceDisplay && (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-bold text-foreground">{priceDisplay}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        per {activityKind === "class" ? "class" : "camper"}
                      </p>
                    </div>
                    {spotsLeft !== null && spotsLeft <= 5 && (
                      <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                        Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                      </span>
                    )}
                  </div>
                )}

                {/* First class date — for ongoing weekly classes */}
                {firstClassDate && statusVariant !== "booked" && (
                  <div className="rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {classSchedule?.sessionStartDate ? "Enrollment starts" : "Your first class"}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {firstClassDate.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {statusVariant === null && (
                  <>
                    {/* Appointment-style slot picker for ongoing classes */}
                    {isAppointmentClass && (
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
                          Choose your time
                        </label>
                        <Select value={selectedSlotKey} onValueChange={setSelectedSlotKey}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((slot) => (
                              <SelectItem key={slot.key} value={slot.key}>{slot.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Class multi-slot picker */}
                    {isMultiSlotClass ? (
                      <div className="space-y-2">
                        {/* Selection summary */}
                        <p className="text-xs text-muted-foreground px-0.5">
                          {selectedSessionIds.size === 0
                            ? "Select one or more sessions"
                            : `${selectedSessionIds.size} session${selectedSessionIds.size !== 1 ? "s" : ""} selected`}
                        </p>

                        {/* Session cards */}
                        {visibleSlots!.map((session, idx) => {
                          const isSelected = selectedSessionIds.has(session.id);
                          const isCamp = activityKind !== "class";
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => toggleSession(session.id)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30 hover:bg-muted/40"}`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Checkbox indicator */}
                                <span className={`shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                                  {isSelected && (
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>

                                <div className="flex-1 min-w-0">
                                  {isCamp && (
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                      {session.label?.trim() || `Session ${idx + 1}`}
                                    </p>
                                  )}
                                  {sessionsShareDates ? (
                                    /* Same date range — lead with time, show days + date as context */
                                    <>
                                      {session.startTime && session.endTime && (
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatTimeLocal(session.startTime)} – {formatTimeLocal(session.endTime)}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {session.days && session.days.length > 0
                                          ? session.days.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")
                                          : formatDateRange(session.startDate, session.endDate)}
                                      </p>
                                    </>
                                  ) : (
                                    /* Different date ranges — lead with date, show time below */
                                    <>
                                      <p className="text-sm font-semibold text-foreground">
                                        {isCamp
                                          ? (formatDateRange(session.startDate, session.endDate) ?? "Dates TBD")
                                          : formatDate(session.startDate).full}
                                      </p>
                                      {(session.startTime || (session.days && session.days.length > 0)) && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {session.days && session.days.length > 0 && (
                                            <span>{session.days.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}{session.startTime ? " · " : ""}</span>
                                          )}
                                          {session.startTime && session.endTime && `${formatTimeLocal(session.startTime)} – ${formatTimeLocal(session.endTime)}`}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>

                                {session.capacity && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {session.capacity} spots
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {campSessions!.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllSlots(!showAllSlots)}
                            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                          >
                            {showAllSlots ? "Show fewer dates" : "Show all dates"}
                          </button>
                        )}

                        {/* Guests */}
                        <div className="mt-1">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-0.5">Guests</label>
                          <select
                            className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 appearance-none"
                            value={reservationGuests}
                            onChange={(e) => setReservationGuests(Number(e.target.value))}
                          >
                            {Array.from({ length: Math.max(1, Math.min(spotsLeft ?? 10, 10)) }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n} camper{n !== 1 ? "s" : ""}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Standard camp: date + guests dropdowns */
                      <div className="space-y-2">
                        {/* Single-session schedule summary */}
                        {campSessions && campSessions.length === 1 && (() => {
                          const s = campSessions[0];
                          const dayLabels = s.days && s.days.length > 0
                            ? s.days.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")
                            : null;
                          const startFmt = s.startTime ? formatTimeLocal(s.startTime) : null;
                          const endFmt = s.endTime ? formatTimeLocal(s.endTime) : null;
                          const timeStr = startFmt && endFmt ? `${startFmt} – ${endFmt}` : null;
                          const dateRange = formatDateRange(s.startDate, s.endDate);
                          return (
                            <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-0.5">
                              <p className="text-sm font-semibold text-foreground">
                                {dayLabels ? `Every ${dayLabels}` : dateRange}{timeStr ? ` · ${timeStr}` : ""}
                              </p>
                              {dayLabels && (
                                <p className="text-xs text-muted-foreground">{dateRange}</p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Date — only show when there are multiple sessions to pick from */}
                        {campSessions && campSessions.length > 1 && (
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">Date</label>
                            <select
                              className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 appearance-none"
                              value={selectedSessionIds.size === 1 ? [...selectedSessionIds][0] : ""}
                              onChange={(e) => setSelectedSessionIds(e.target.value ? new Set([e.target.value]) : new Set())}
                            >
                              <option value="">Select a date</option>
                              {campSessions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {formatDate(s.startDate).full}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Guests */}
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">Guests</label>
                          <Select
                            value={String(reservationGuests)}
                            onValueChange={(v) => setReservationGuests(Number(v))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.max(1, Math.min(spotsLeft ?? 10, 10)) }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>{n} guest{n !== 1 ? "s" : ""}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* ── Add-ons accordion ── */}
                    {hasAddons && (
                      <div className="rounded-xl overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                          onClick={() => setAddonsExpanded(!addonsExpanded)}
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">Add ons</p>
                            <p className="text-xs text-muted-foreground">Optional convenience for families</p>
                          </div>
                          {addonsExpanded
                            ? <span className="material-symbols-rounded select-none text-muted-foreground shrink-0" style={{ fontSize: 16 }} aria-hidden>expand_less</span>
                            : <span className="material-symbols-rounded select-none text-muted-foreground shrink-0" style={{ fontSize: 16 }} aria-hidden>expand_more</span>
                          }
                        </button>

                        {addonsExpanded && (
                          <div className="border-t border-border p-3 space-y-2">

                            {/* Early drop-off */}
                            {!isAppointmentClass && advanced?.earlyDropoff?.enabled && advanced?.earlyDropoff?.price && (
                              <div className={`rounded-xl border px-4 py-3 space-y-3 transition-colors ${earlyDropoffSelected ? "border-blue-300 bg-blue-50/40" : "border-border"}`}>
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      id="early-dropoff"
                                      checked={earlyDropoffSelected}
                                      onChange={(e) => setEarlyDropoffSelected(e.target.checked)}
                                      className="mt-0.5 h-4 w-4 rounded border-border accent-foreground cursor-pointer"
                                    />
                                    <label htmlFor="early-dropoff" className="cursor-pointer">
                                      <p className="text-sm font-semibold text-foreground">Early drop-off</p>
                                      <p className="text-xs text-muted-foreground">
                                        {advanced.earlyDropoff.start
                                          ? `Starts at ${formatTimeLocal(advanced.earlyDropoff.start)}`
                                          : "Early drop-off"}
                                      </p>
                                    </label>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm text-muted-foreground">
                                      {advanced.earlyDropoff.price ? `+ ${advanced.earlyDropoff.price}/day` : ""}
                                    </p>
                                    {!earlyDropoffSelected && earlyDropoffPriceCents > 0 && totalCampDays > 0 && (
                                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        {formatCents(earlyDropoffPriceCents * totalCampDays)} for all {totalCampDays} days
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {earlyDropoffSelected && (
                                  <div className="space-y-2">
                                    {/* Segmented control + cost inline */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="inline-flex rounded-lg overflow-hidden text-xs font-medium shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setEarlyDropoffMode("all")}
                                          className={`px-3 py-1.5 transition-colors ${earlyDropoffMode === "all" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}
                                        >
                                          All days
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEarlyDropoffMode("pick")}
                                          className={`px-3 py-1.5 border-l border-border transition-colors ${earlyDropoffMode === "pick" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}
                                        >
                                          Pick days
                                        </button>
                                      </div>
                                      {earlyDropoffPriceCents > 0 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                          {formatCents(earlyDropoffPriceCents)}/day × {getAddonDayCount(earlyDropoffMode, earlyDropoffDays)} days = {formatCents(earlyDropoffPriceCents * getAddonDayCount(earlyDropoffMode, earlyDropoffDays))}
                                        </p>
                                      )}
                                    </div>

                                    {/* Summary row — only in pick mode */}
                                    {earlyDropoffMode === "pick" && (
                                      <div className="flex items-center justify-between rounded-lg bg-foreground/[0.06] px-3 py-2.5">
                                        <p className="text-xs text-muted-foreground">
                                          {earlyDropoffDays.size} of {totalCampDays} day{totalCampDays !== 1 ? "s" : ""} selected
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => openPickDays("earlyDropoff")}
                                          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors"
                                        >
                                          Pick days
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Extended day */}
                            {!isAppointmentClass && advanced?.extendedDay?.enabled && advanced?.extendedDay?.price && (
                              <div className={`rounded-xl border px-4 py-3 space-y-3 transition-colors ${extendedDaySelected ? "border-blue-300 bg-blue-50/40" : "border-border"}`}>
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      id="extended-day"
                                      checked={extendedDaySelected}
                                      onChange={(e) => setExtendedDaySelected(e.target.checked)}
                                      className="mt-0.5 h-4 w-4 rounded border-border accent-foreground cursor-pointer"
                                    />
                                    <label htmlFor="extended-day" className="cursor-pointer">
                                      <p className="text-sm font-semibold text-foreground">Extended day</p>
                                      <p className="text-xs text-muted-foreground">
                                        {advanced.extendedDay.end
                                          ? `Ends at ${formatTimeLocal(advanced.extendedDay.end)}`
                                          : "Extended day"}
                                      </p>
                                    </label>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm text-muted-foreground">
                                      {advanced.extendedDay.price ? `+ ${advanced.extendedDay.price}/day` : ""}
                                    </p>
                                    {!extendedDaySelected && extendedDayPriceCents > 0 && totalCampDays > 0 && (
                                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        {formatCents(extendedDayPriceCents * totalCampDays)} for all {totalCampDays} days
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {extendedDaySelected && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="inline-flex rounded-lg overflow-hidden text-xs font-medium shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setExtendedDayMode("all")}
                                          className={`px-3 py-1.5 transition-colors ${extendedDayMode === "all" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}
                                        >
                                          All days
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setExtendedDayMode("pick")}
                                          className={`px-3 py-1.5 border-l border-border transition-colors ${extendedDayMode === "pick" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}
                                        >
                                          Pick days
                                        </button>
                                      </div>
                                      {extendedDayPriceCents > 0 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                          {formatCents(extendedDayPriceCents)}/day × {getAddonDayCount(extendedDayMode, extendedDayDays)} days = {formatCents(extendedDayPriceCents * getAddonDayCount(extendedDayMode, extendedDayDays))}
                                        </p>
                                      )}
                                    </div>

                                    {extendedDayMode === "pick" && (
                                      <div className="flex items-center justify-between rounded-lg bg-foreground/[0.06] px-3 py-2.5">
                                        <p className="text-xs text-muted-foreground">
                                          {extendedDayDays.size} of {totalCampDays} day{totalCampDays !== 1 ? "s" : ""} selected
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => openPickDays("extendedDay")}
                                          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors"
                                        >
                                          Pick days
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Sibling discount */}
                            {advanced?.siblingDiscount?.enabled && advanced.siblingDiscount.value && (
                              <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-muted/30">
                                <span className="material-symbols-rounded select-none shrink-0 text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>percent</span>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Sibling discount</p>
                                  <p className="text-xs text-muted-foreground">
                                    {advanced.siblingDiscount.type === "percent"
                                      ? `${advanced.siblingDiscount.value}% off`
                                      : `$${advanced.siblingDiscount.value} off`}{" "}
                                    for additional siblings — applied at checkout
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Running total */}
                    {showTotal && (
                      <div className="rounded-xl bg-muted/60 px-4 py-3 space-y-1.5">
                        {baseCents > 0 && reservationGuests > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{priceDisplay} × {reservationGuests} guest{reservationGuests !== 1 ? "s" : ""}</span>
                            <span>{formatCents(baseCents * reservationGuests)}</span>
                          </div>
                        )}
                        {earlyDropoffAddonTotal > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Early drop-off</span>
                            <span>{formatCents(earlyDropoffAddonTotal)}</span>
                          </div>
                        )}
                        {extendedDayAddonTotal > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Extended day</span>
                            <span>{formatCents(extendedDayAddonTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-1.5 mt-1">
                          <span>Total</span>
                          <span>{formatCents(totalCents)}</span>
                        </div>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        disabled={isAppointmentClass && !selectedSlotKey}
                        onClick={() => {
                          if (!user) { setAuthReason("booking"); setAuthOpen(true); return; }
                          const params = new URLSearchParams({ guests: String(reservationGuests) });
                          if (selectedSessionIds.size > 0) params.set("sessions", [...selectedSessionIds].join(","));
                          if (selectedSlotKey) params.set("slot", selectedSlotKey);
                          router.push(`/checkout/${id}?${params.toString()}`);
                        }}
                        className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Reserve
                      </button>
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        Contact host
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">You won&apos;t be charged yet</p>
                  </>
                )}

                {statusVariant === "booked" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      🌱 You&apos;re in. We can&apos;t wait to see you!
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = window.location.href;
                          if (navigator.share) {
                            navigator.share({ title: camp.name, url });
                          } else {
                            navigator.clipboard.writeText(url);
                          }
                        }}
                        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Invite a friend
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!booking?.id) return;
                          const confirmed = window.confirm("Cancel your reservation?");
                          if (!confirmed) return;
                          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
                          setBooking(null);
                          // Notify waitlisted users that a spot opened up
                          fetch("/api/waitlist/promote", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ campId: id }),
                          }).catch(() => {});
                        }}
                        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Cancel reservation
                      </button>
                    </div>
                  </div>
                )}
                {justFull && statusVariant !== "waitlisted" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    This camp just filled up while you were checking out. You can join the waitlist below.
                  </div>
                )}
                {statusVariant === "waitlisted" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 space-y-0.5">
                      <p className="text-sm font-semibold text-violet-800">You&apos;re on the waitlist</p>
                      <p className="text-xs text-violet-600">
                        {waitlistPosition != null
                          ? `You're #${waitlistPosition} in line — we'll email you if a spot opens up.`
                          : "We'll email you if a spot opens up."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!booking?.id) return;
                        const ok = window.confirm("Leave the waitlist?");
                        if (!ok) return;
                        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
                        setBooking(null);
                        setWaitlistPosition(null);
                      }}
                      className="w-full rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Leave waitlist
                    </button>
                  </div>
                )}
                {statusVariant === "full" && (
                  enableWaitlist ? (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground text-center">
                        This session is full — but you can join the waitlist.
                      </div>
                      <button
                        type="button"
                        disabled={joiningWaitlist}
                        onClick={async () => {
                          if (!user) { setAuthReason("booking"); setAuthOpen(true); return; }
                          setJoiningWaitlist(true);
                          try {
                            const res = await fetch("/api/waitlist/join", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                campId: id,
                                campName: name,
                                userId: user.id,
                                email: user.email,
                                guests: reservationGuests,
                                sessionIds: [...selectedSessionIds],
                              }),
                            });
                            const json = await res.json();
                            if (json.waitlisted) {
                              setBooking({ id: json.bookingId, status: "waitlisted" });
                              // Fetch position — count all waitlisted for this camp
                              const { count: wCount } = await supabase
                                .from("bookings").select("*", { count: "exact", head: true })
                                .eq("camp_id", id).eq("status", "waitlisted");
                              setWaitlistPosition(wCount ?? null);
                            } else {
                              alert(json.error ?? "Something went wrong. Please try again.");
                            }
                          } finally {
                            setJoiningWaitlist(false);
                          }
                        }}
                        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                      >
                        {joiningWaitlist ? "Joining…" : "Join Waitlist"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground text-center">
                      This session is full.
                    </div>
                  )
                )}
                {statusVariant === "ended" && (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground text-center">
                      This camp has ended.
                    </div>
                    {booking?.status === "confirmed" && !alreadyReviewed && (
                      <button
                        type="button"
                        onClick={() => router.push(`/review/${booking.id}`)}
                        className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        ⭐ Leave a review
                      </button>
                    )}
                    {alreadyReviewed && (
                      <p className="text-center text-xs text-muted-foreground">
                        ✓ Thanks for your review!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Class schedule details */}
            {classSchedule?.frequency && (
              <div className="flex items-start gap-4 py-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <span className="material-symbols-rounded select-none text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>repeat</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{frequencyLabel(classSchedule.frequency)}</p>
                  {classSchedule.duration && <p className="text-xs text-muted-foreground mt-0.5">{classSchedule.duration} min per session</p>}
                </div>
              </div>
            )}

            {/* Capacity */}
            {totalCapacity != null && (
              <div className="flex items-start gap-4 py-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <span className="material-symbols-rounded select-none text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>group</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isFull ? "Fully booked" : spotsLeft === 1 ? "1 spot left" : `${spotsLeft} spots left`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{confirmed} of {totalCapacity} booked</p>
                </div>
              </div>
            )}

            {/* Activities */}
            {campActivities && campActivities.length > 0 && (
              <div className="space-y-3 py-2">
                <h2 className="text-base font-semibold text-foreground">What you&apos;ll do</h2>
                <div className="space-y-2.5">
                  {campActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2.5">
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                      <div>
                        {activity.title && <p className="text-sm font-medium text-foreground">{activity.title}</p>}
                        {activity.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activity.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            {description && (
              <div className="space-y-2 py-2">
                <h2 className="text-base font-semibold text-foreground">About</h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {description.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Additional details */}
            {additionalDetails && (
              <div className="space-y-2 py-2">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>menu_book</span> What to bring
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{additionalDetails}</p>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="space-y-5 py-2">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="0.5" className="shrink-0">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-base font-bold text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Individual reviews */}
                <div className="space-y-5">
                  {reviews.map((review) => {
                    const initials = review.reviewer_name
                      ? review.reviewer_name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                      : "?";
                    const dateStr = new Date(review.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {review.reviewer_name ?? "Anonymous"}
                            </p>
                            <p className="text-xs text-muted-foreground">{dateStr}</p>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <svg
                                key={n}
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill={review.rating >= n ? "#fbbf24" : "none"}
                                stroke={review.rating >= n ? "#fbbf24" : "#d1d5db"}
                                strokeWidth="1.5"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        {review.body && (
                          <p className="text-sm leading-relaxed text-muted-foreground pl-11">
                            {review.body}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancellation policy */}
            {cancellationPolicy && (
              <div className="flex items-start gap-3 py-2">
                <span className="material-symbols-rounded select-none mt-0.5 shrink-0 text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>calendar_month</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cancellation policy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cancellationPolicy}</p>
                </div>
              </div>
            )}

          </div>
        </div>
          </div>
        </div>
      </div>

      {/* ── Image lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            type="button"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: 20 }} aria-hidden>close</span>
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); }}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 20 }} aria-hidden>chevron_left</span>
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIdx]}
            alt={name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % images.length); }}
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: 20 }} aria-hidden>chevron_right</span>
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">
              {lightboxIdx + 1} / {images.length}
            </p>
          )}
        </div>
      )}

      {/* ── Pick days modal ── */}
      <Dialog open={pickDaysModal !== null} onOpenChange={(open) => { if (!open) setPickDaysModal(null); }}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-xl">
              {pickDaysModal === "earlyDropoff" ? "Early drop-off options" : "Extended day options"}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable day list */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
            {daysByWeek.length > 0 ? daysByWeek.map((week, wi) => {
              const allSelected = week.days.every((d) => pickDaysTemp.has(d.dateStr));
              const noneSelected = week.days.every((d) => !pickDaysTemp.has(d.dateStr));
              return (
                <div key={wi}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-foreground capitalize">{week.label}</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWeekSelection(week.days, true)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${allSelected ? "bg-muted text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeekSelection(week.days, false)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${noneSelected ? "bg-muted text-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-border border-t border-b border-border">
                    {week.days.map((day) => (
                      <label key={day.dateStr} className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-6 px-6 transition-colors">
                        <input
                          type="checkbox"
                          checked={pickDaysTemp.has(day.dateStr)}
                          onChange={() => togglePickDay(day.dateStr)}
                          className="h-5 w-5 rounded border-border accent-foreground cursor-pointer"
                        />
                        <span className="text-sm text-foreground">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No camp days available.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPickDaysModal(null)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyPickDays}
              className="rounded-xl bg-foreground px-5 py-2 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={authOpen}
        reason={authReason}
        onClose={() => { setAuthOpen(false); setPendingMessage(false); }}
        onSignedIn={() => setAuthOpen(false)}
      />

      {/* Share modal */}
      <Dialog open={shareOpen} onOpenChange={(o) => { setShareOpen(o); if (!o) { setShareRecipient(""); setShareMessage(""); setShareSent(false); setShareCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Share listing</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-1">
            <Input
              type="text"
              value={shareRecipient}
              onChange={e => setShareRecipient(e.target.value)}
              placeholder="Enter email addresses or phone numbers"
            />
            <Textarea
              value={shareMessage}
              onChange={e => setShareMessage(e.target.value)}
              placeholder="Add your custom message here"
              rows={5}
              className="resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleCopyLink}
            >
              {shareCopied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={!shareRecipient.trim() || shareSending}
              onClick={async () => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                const recipients = shareRecipient.split(/[,;\s]+/).map(r => r.trim()).filter(Boolean);
                setShareSending(true);
                try {
                  await Promise.all(recipients.map(email =>
                    fetch("/api/send-invite", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email,
                        shareUrl: url,
                        senderName: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? undefined,
                        message: shareMessage.trim() || undefined,
                      }),
                    })
                  ));
                  setShareSent(true);
                  setTimeout(() => setShareOpen(false), 1200);
                } finally {
                  setShareSending(false);
                }
              }}
            >
              {shareSent ? "Sent!" : shareSending ? "Sending…" : "Share"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
