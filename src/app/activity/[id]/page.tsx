"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCampFavorite } from "@/hooks/useCampFavorite";
import type { Camp } from "@/components/CampCard";
import { HostCard } from "@/components/HostCard";
import { HostedItem } from "@/components/HostedItem";
import { ActivityImageGrid } from "@/components/ActivityImageGrid";
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
import { RegistrationPanel } from "@/components/RegistrationPanel";
import type { RegistrationStatus, RegistrationSession, RegistrationAddon, AddonState } from "@/components/RegistrationPanel";
import { FlexibleBookingPanel } from "@/components/FlexibleBookingPanel";
import type { TimeOption, FlexPricing, FlexRange } from "@/components/FlexibleBookingPanel";
import { Alert } from "@/components/ui/Alert";
import { AttendanceCard } from "@/components/AttendanceCard";
import { ExploreMoreSection } from "@/components/ExploreMoreSection";

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

function getSeasonLabel(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 5 && month <= 7) return `Summer ${year}`;
  if (month >= 8 && month <= 10) return `Fall ${year}`;
  if (month === 11 || month <= 1) return `Winter ${year}`;
  return `Spring ${year}`;
}

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
  const sStr = s.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (!e || isNaN(e.getTime())) return sStr;
  const eStr = e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const justFull = searchParams.get("full") === "1";
  const { user, loading: authLoading } = useAuth();

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
    wowzi_managed?: boolean;
    is_claimed?: boolean;
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
  const [friendsGoing, setFriendsGoing] = useState<{ id: string; name: string; avatarUrl?: string | null }[]>([]);
  const [friendsGoingTotal, setFriendsGoingTotal] = useState(0);
  const [nearbyCamps, setNearbyCamps] = useState<Camp[]>([]);

  const { isFavorite, favoriteLoading, toggleFavorite } = useCampFavorite(camp?.id ?? null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoadingCamp(true);
      setCampError(null);
      const { data, error } = await supabase.from("camps")
        .select("id, slug, name, description, image_url, image_urls, hero_image_url, price_cents, price_unit, listing_type, schedule_days, meta, host_id, capacity, start_time, end_time, is_published, external_url, location, featured")
        .eq("short_id", id).maybeSingle();
      if (error || !data) { setCampError("We couldn't load this camp."); setLoadingCamp(false); return; }
      setCamp(data as FullCamp);
      setLoadingCamp(false);

      if ((data as FullCamp).host_id) {
        const apiRes = await fetch(`/api/profiles/${(data as FullCamp).host_id}`);
        if (apiRes.ok) {
          setHostProfile(await apiRes.json() as any);
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_first_name, legal_name, avatar_url, wowzi_managed, is_claimed")
            .eq("id", (data as FullCamp).host_id!)
            .maybeSingle();
          if (profile) setHostProfile(profile as any);
        }
      }
    };
    void load();
  }, [id]);

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

  // Friends going — query connections who have confirmed bookings for this camp
  useEffect(() => {
    if (!user || !camp?.id) return;
    const load = async () => {
      // Get user's connections (following)
      const { data: connections } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (!connections?.length) return;

      const connectionIds = connections.map((c) => c.following_id);

      // Find which of those have confirmed bookings for this camp
      const { data: bookings } = await supabase
        .from("bookings")
        .select("user_id, profiles(id, preferred_first_name, legal_name, avatar_url)")
        .eq("camp_id", camp.id)
        .eq("status", "confirmed")
        .in("user_id", connectionIds);

      if (!bookings?.length) return;

      const friends = bookings.map((b: any) => ({
        id: b.user_id,
        name: b.profiles?.preferred_first_name || b.profiles?.legal_name || "Friend",
        avatarUrl: b.profiles?.avatar_url ?? null,
      }));

      setFriendsGoing(friends);
      setFriendsGoingTotal(friends.length);
    };
    void load();
  }, [user, camp?.id]);

  useEffect(() => {
    if (!camp?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("camps")
        .select("id, slug, short_id, name, image_url, image_urls, hero_image_url, price_cents, price_unit, listing_type, schedule_days, meta, start_time, end_time")
        .eq("is_published", true)
        .neq("id", camp.id)
        .not("hero_image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setNearbyCamps(data as Camp[]);
    };
    void load();
  }, [camp?.id]);

  if (loadingCamp) {
    return (
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-12-center">
              <div className="grid grid-cols-12 gap-gutter items-start animate-pulse">
                <div className="col-span-5 aspect-square rounded-3xl bg-muted" />
                <div className="col-span-7 space-y-4">
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
            <div className="span-12-center">
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

  const { id: campId, name, description, image_urls, image_url, hero_image_url, price_cents, meta, location_city, location_neighborhood, host_id, capacity, start_time, end_time } = camp;

  // Images — deduplicate across hero_image_url / image_urls / image_url
  const imageCandidates: string[] = [];
  if (hero_image_url) imageCandidates.push(hero_image_url);
  if (image_urls?.length) imageCandidates.push(...(image_urls.filter(Boolean) as string[]));
  if (image_url) imageCandidates.push(image_url);
  const seen = new Set<string>();
  const images = imageCandidates.filter(url => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  if (images.length === 0) images.push("https://placehold.co/800x800?text=No+photo");

  // Price
  const price = Number.isInteger(price_cents) ? `$${((price_cents || 0) / 100).toFixed(0)}` : null;
  const pricingMeta = meta?.pricing as { display?: string } | undefined;
  const rawDisplay = pricingMeta?.display || price;
  const priceDisplay = rawDisplay
    ? (pricingMeta?.display ? rawDisplay : rawDisplay.startsWith("$") ? rawDisplay : `$${rawDisplay}`)
    : null;

  // Host
  const orgName = meta?.organizationName as string | undefined;
  const orgSlug = meta?.organizationSlug as string | undefined;
  const hostName = orgName || hostProfile?.preferred_first_name || hostProfile?.legal_name || (meta?.host_name as string | undefined) || "Wowzi Host";
  const hostAvatarUrl = hostProfile?.avatar_url || (meta?.organizationLogo as string | undefined) || null;
  const hostInitial = hostName.charAt(0).toUpperCase();

  // Dates
  const startDate = start_time ? formatDate(start_time) : null;
  const rawDateLabel = meta?.dateLabel as string | undefined;
  // For multi-session camps, derive the date label from the full session range
  const sessionDateLabel = (() => {
    const sessions = meta?.campSessions as Array<{ startDate?: string; endDate?: string }> | undefined;
    if (!sessions || sessions.length === 0) return null;
    const starts = sessions.map(s => s.startDate).filter(Boolean).sort() as string[];
    const ends = sessions.map(s => s.endDate || s.startDate).filter(Boolean).sort() as string[];
    if (!starts.length) return null;
    return formatDateRange(starts[0], ends[ends.length - 1]);
  })();
  const dateLabel = sessionDateLabel
    ? sessionDateLabel
    : rawDateLabel
    ? (!/\d{4}/.test(rawDateLabel) && start_time
      ? `${rawDateLabel}, ${new Date(start_time.includes("T") ? start_time : start_time + "T12:00:00").getFullYear()}`
      : rawDateLabel)
    : (startDate ? startDate.full : null);
  const firstSessionDate = (meta?.campSessions as Array<{ startDate?: string }> | undefined)?.[0]?.startDate ?? null;
  const seasonLabel = start_time
    ? getSeasonLabel(start_time)
    : firstSessionDate
    ? getSeasonLabel(firstSessionDate)
    : null;

  const timeLabel = (() => {
    if (meta?.timeLabel) return meta.timeLabel as string;
    const fixed = meta?.fixedSchedule as { startTime?: string; endTime?: string; allDay?: boolean } | undefined;
    if (fixed?.allDay) return "All day";
    if (fixed?.startTime && fixed?.endTime) return `${formatTimeLocal(fixed.startTime)} – ${formatTimeLocal(fixed.endTime)}`;
    if (start_time && end_time) return `${formatTime(start_time)} – ${formatTime(end_time)}`;
    if (start_time) return formatTime(start_time);
    return null;
  })();

  // Location
  const isVirtual = meta?.isVirtual as boolean | undefined;
  const locationVenueName = (meta?.locationName as string | undefined)
    || (meta?.location_name as string | undefined)
    || null;
  const locationCityState = [location_neighborhood, location_city].filter(Boolean).join(", ")
    || (camp as any).location as string | null
    || (meta?.locationName2 as string | undefined)
    || (meta?.location_address as string | undefined)
    || null;
  const locationLine = isVirtual ? "Online event" : locationCityState;

  // Meta fields
  const category = meta?.category as string | undefined;
  const ageBuckets = (meta?.age_buckets as string[] | undefined) || [];
  const minAge = meta?.min_age as number | undefined;
  const maxAge = meta?.max_age as number | undefined;
  const experienceLevels = (meta?.experienceLevel as string[] | undefined) || [];
  const activityKindRaw = meta?.activityKind as string | undefined;
  const activityKind = activityKindRaw
    ? (activityKindRaw.charAt(0).toUpperCase() + activityKindRaw.slice(1)) as "camp" | "class" | undefined
    : undefined;
  const cancellationPolicy = meta?.cancellation_policy as string | undefined;
  const metaSections = (meta?.sections as Array<{ title: string; body: string; linkLabel?: string; linkUrl?: string }> | undefined) ?? [];
  const additionalDetails = meta?.additionalDetails as string | undefined;

  // Flexible booking model
  const bookingModel = meta?.bookingModel as string | undefined;
  const flexTimeOptions = (meta?.timeOptions as TimeOption[] | undefined) ?? [];
  const flexPricing = (meta?.flexPricing as FlexPricing | undefined) ?? {};
  const flexRange = meta?.flexRange as FlexRange | undefined;
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
    id: string; label?: string; ageGroup?: string; sessionType?: string;
    startDate: string; endDate: string;
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
    if (meta?.ageLabel) return meta.ageLabel as string;
    if (minAge != null && maxAge != null) return `Ages ${minAge}–${maxAge}`;
    if (minAge != null) return `Ages ${minAge}+`;
    if (ageBuckets.length) return ageBucketLabel(ageBuckets);
    return null;
  })();
  const ageDescription = (meta?.age_description as string | undefined) ?? null;
  const priceDescription = (meta?.price_description as string | undefined) ?? null;

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

  function toggleSession(sessionId: string) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  // ── RegistrationPanel props ──

  const registrationSessions: RegistrationSession[] = campSessions?.map((s, idx) => ({
    id: s.id ?? String(idx),
    name: s.label?.trim() || `Session ${idx + 1}`,
    ageGroup: s.ageGroup,
    sessionType: s.sessionType,
    dateRange: formatDateRange(s.startDate, s.endDate) ?? s.startDate,
    timeRange: (s.startTime && s.endTime) ? `${formatTimeLocal(s.startTime)} – ${formatTimeLocal(s.endTime)}` : undefined,
    spotsRemaining: s.capacity ? Number(s.capacity) : null,
  })) ?? [];

  const registrationAddons: RegistrationAddon[] = [];
  if (!isAppointmentClass && advanced?.earlyDropoff?.enabled && advanced?.earlyDropoff?.price) {
    registrationAddons.push({ id: "earlyDropoff", name: "Early drop-off", priceLabel: `+ ${advanced.earlyDropoff.price}/day`, priceCents: earlyDropoffPriceCents, totalDays: totalCampDays });
  }
  if (!isAppointmentClass && advanced?.extendedDay?.enabled && advanced?.extendedDay?.price) {
    registrationAddons.push({ id: "extendedDay", name: "Extended day", priceLabel: `+ ${advanced.extendedDay.price}/day`, priceCents: extendedDayPriceCents, totalDays: totalCampDays });
  }

  const registrationAddonStates: Record<string, AddonState> = {
    earlyDropoff: { selected: earlyDropoffSelected, mode: earlyDropoffMode, daysSelected: earlyDropoffDays.size },
    extendedDay:  { selected: extendedDaySelected,  mode: extendedDayMode,  daysSelected: extendedDayDays.size  },
  };

  function handleAddonToggle(addonId: string) {
    if (addonId === "earlyDropoff") setEarlyDropoffSelected(v => !v);
    if (addonId === "extendedDay")  setExtendedDaySelected(v => !v);
  }
  function handleAddonModeChange(addonId: string, mode: "all" | "pick") {
    if (addonId === "earlyDropoff") setEarlyDropoffMode(mode);
    if (addonId === "extendedDay")  setExtendedDayMode(mode);
  }
  function handleAddonEditDays(addonId: string) {
    openPickDays(addonId as "earlyDropoff" | "extendedDay");
  }

  function handleReserve() {
    if (!user) { setAuthReason("booking"); setAuthOpen(true); return; }
    const qs = new URLSearchParams({ guests: String(reservationGuests) });
    if (selectedSessionIds.size > 0) qs.set("sessions", [...selectedSessionIds].join(","));
    if (selectedSlotKey) qs.set("slot", selectedSlotKey);
    router.push(`/checkout/${id}?${qs.toString()}`);
  }

  return (
    <main>
      <div className="page-container pb-8">
        <div className="page-grid">
          <div className="span-12-center">


        <div className="grid grid-cols-12 gap-gutter gap-y-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="col-span-5 space-y-4">

            {/* Image grid */}
            <ActivityImageGrid
              images={images}
              alt={name}
              onImageClick={(i) => { setLightboxIdx(i); setLightboxOpen(true); }}
            />

            {/* Host item */}
            <HostedItem
              hostName={hostName}
              hostAvatarUrl={hostAvatarUrl}
              hostProfileHref={host_id ? `/profile/${host_id}` : "#"}
              onContact={handleSendMessage}
            />

            {/* Friends going */}
            <AttendanceCard
              friends={friendsGoing}
              totalGoing={friendsGoingTotal}
            />


          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="col-span-7 flex flex-col gap-5">

            {/* Header — always on top */}
            <div>
            <CampDetailHeader
              name={name}
              isFeatured={!!camp.featured}
              activityKind={activityKind}
              chipLabel={category ?? camp.listing_type ?? undefined}
              seasonLabel={seasonLabel}
              isFavorite={isFavorite}
              favoriteDisabled={favoriteLoading}
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
              ageDescription={ageDescription}
              priceLabel={priceDisplay ?? undefined}
              priceDescription={priceDescription}
            />
            </div>

            {/* ── Description group: on mobile shows BEFORE booking ── */}
            <div className="order-2 md:order-3 flex flex-col gap-5">

            {/* ── External partner CTA ── */}
            {camp.external_url && (
              <>
                <Alert
                  tone="warning"
                  icon="outbound"
                  action={{ label: "Register now", onClick: () => window.open(camp.external_url!, "_blank") }}
                >
                  Registration is handled on their website.
                </Alert>

                {description && (
                  <div className="space-y-2 py-2">
                    <h2 className="text-[14px] font-semibold text-foreground">About</h2>
                    <div className="space-y-3 text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.8)" }}>
                      {description.split(/\n\n+/).map((para, i) => (
                        <p key={i}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(meta?.highlights) && (meta.highlights as string[]).filter(Boolean).length > 0 && (
                  <div className="space-y-2 py-2">
                    <h2 className="text-[14px] font-semibold text-foreground">Highlights</h2>
                    <ul className="space-y-3">
                      {(meta.highlights as string[]).filter(Boolean).map((h, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(0,0,0,0.8)" }}>
                          <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-foreground/80" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            </div>{/* end description group (external) */}

            {/* ── Booking group: on mobile shows AFTER description ── */}
            <div className="order-3 md:order-2 flex flex-col gap-5">

            {/* ── Reservation card: status states → RegistrationPanel ── */}
            {!camp.external_url && statusVariant !== null && (
              <RegistrationPanel
                status={
                  statusVariant === "waitlisted"
                    ? "waitlist"
                    : (statusVariant as "booked" | "full" | "ended")
                }
                guests={reservationGuests}
                onGuestsChange={setReservationGuests}
                onInviteFriend={() => {
                  const url = window.location.href;
                  if (navigator.share) navigator.share({ title: camp.name, url });
                  else navigator.clipboard.writeText(url);
                }}
                onCancelReservation={async () => {
                  if (!booking?.id) return;
                  const confirmed = window.confirm("Cancel your reservation?");
                  if (!confirmed) return;
                  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
                  setBooking(null);
                  fetch("/api/waitlist/promote", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ campId: id }),
                  }).catch(() => {});
                }}
                onJoinWaitlist={async () => {
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
                onExploreSimilar={() => {}}
              />
            )}

            {/* ── Reservation card: available state ── */}
            {!camp.external_url && statusVariant === null && (
            <div className="space-y-4">

              {/* Flexible booking model (e.g. Cooking Camp) */}
              {bookingModel === "flexible" && flexRange && (
                <FlexibleBookingPanel
                  timeOptions={flexTimeOptions}
                  flexPricing={flexPricing}
                  flexRange={flexRange}
                  onReserve={(selection) => {
                    if (!user) { setAuthReason("booking"); setAuthOpen(true); return; }
                    alert(`Booking submitted!\n${JSON.stringify(selection, null, 2)}`);
                  }}
                />
              )}

              {/* Standard booking */}
              {bookingModel !== "flexible" && (
                <>
                  {/* Appointment class: first-class date + slot picker (shown above the panel) */}
                  {(firstClassDate || isAppointmentClass) && (
                    <div className="rounded-card bg-card overflow-hidden px-5 py-4 space-y-4">
                      {firstClassDate && (
                        <div className="rounded-xl bg-muted/40 px-4 py-3">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                            {classSchedule?.sessionStartDate ? "Enrollment starts" : "Your first class"}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {firstClassDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                          </p>
                        </div>
                      )}
                      {isAppointmentClass && (
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">Choose your time</label>
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
                    </div>
                  )}

                  <RegistrationPanel
                    status="available"
                    guests={reservationGuests}
                    maxGuests={spotsLeft ?? 10}
                    onGuestsChange={setReservationGuests}
                    spotsRemaining={spotsLeft}
                    sessions={registrationSessions.length > 0 ? registrationSessions : undefined}
                    selectedSessionIds={selectedSessionIds}
                    onSessionToggle={toggleSession}
                    addons={registrationAddons.length > 0 ? registrationAddons : undefined}
                    addonStates={registrationAddonStates}
                    onAddonToggle={handleAddonToggle}
                    onAddonModeChange={handleAddonModeChange}
                    onAddonEditDays={handleAddonEditDays}
                    onReserve={handleReserve}
                    reserveDisabled={
                      (isAppointmentClass && !selectedSlotKey) ||
                      (registrationSessions.length > 0 && selectedSessionIds.size === 0)
                    }
                  />
                </>
              )}
            </div>
            )}

            {/* Class schedule details */}
            {classSchedule?.frequency && (
              <div className="flex items-start gap-4 py-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <span className="material-symbols-outlined select-none text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>repeat</span>
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
                  <span className="material-symbols-outlined select-none text-muted-foreground" style={{ fontSize: 16 }} aria-hidden>group</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isFull ? "Fully booked" : spotsLeft === 1 ? "1 spot left" : `${spotsLeft} spots left`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{confirmed} of {totalCapacity} booked</p>
                </div>
              </div>
            )}

            </div>{/* end booking group */}

            {/* ── Description group (non-external): on mobile shows BEFORE booking ── */}
            <div className="order-2 md:order-3 flex flex-col gap-5">

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
            {!camp.external_url && description && (
              <div className="space-y-2 py-2">
                <h2 className="text-[14px] font-semibold text-foreground">About</h2>
                <div className="space-y-3 text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.8)" }}>
                  {description.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {!camp.external_url && Array.isArray(meta?.highlights) && (meta.highlights as string[]).filter(Boolean).length > 0 && (
              <div className="space-y-2 py-2">
                <h2 className="text-[14px] font-semibold text-foreground">Highlights</h2>
                <ul className="space-y-3">
                  {(meta.highlights as string[]).filter(Boolean).map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "rgba(0,0,0,0.8)" }}>
                      <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-foreground/80" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional details */}
            {additionalDetails && (
              <div className="space-y-2 py-2">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined select-none" style={{ fontSize: 16 }} aria-hidden>menu_book</span> What to bring
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

            {/* Extra sections (Please Note, Scholarships, etc.) */}
            {metaSections.map((section, i) => (
              <div key={i} className="space-y-2 py-2">
                <h2 className="text-[14px] font-semibold text-foreground">{section.title}</h2>
                <div className="space-y-3 text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.8)" }}>
                  {section.body.split(/\n\n+/).map((para, j) => (
                    <p key={j}>{para.trim()}</p>
                  ))}
                </div>
                {section.linkLabel && section.linkUrl && (
                  <a
                    href={section.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {section.linkLabel}
                    <span className="material-symbols-outlined select-none" style={{ fontSize: 13 }} aria-hidden>open_in_new</span>
                  </a>
                )}
              </div>
            ))}

            {/* Refund policy */}
            {cancellationPolicy && (
              <div className="space-y-2 py-2">
                <h2 className="text-[14px] font-semibold text-foreground">Refund policy</h2>
                <div className="space-y-3 text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.8)" }}>
                  {cancellationPolicy.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            </div>{/* end description group (non-external) */}

          </div>{/* end right column */}
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
            <span className="material-symbols-outlined select-none" style={{ fontSize: 20 }} aria-hidden>close</span>
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); }}
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: 20 }} aria-hidden>chevron_left</span>
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
              <span className="material-symbols-outlined select-none" style={{ fontSize: 20 }} aria-hidden>chevron_right</span>
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

      {/* ── Explore more ── */}
      <ExploreMoreSection camps={nearbyCamps} title="Keep exploring" />

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
