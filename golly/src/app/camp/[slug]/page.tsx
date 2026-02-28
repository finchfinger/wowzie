"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCampFavorite } from "@/hooks/useCampFavorite";
import type { Camp } from "@/components/CampCard";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Wifi,
  ChevronRight,
  Heart,
  Baby,
  Repeat,
  Sunset,
  Sunrise,
  BadgePercent,
  BookOpen,
} from "lucide-react";

/* ── Types ── */

type FullCamp = Camp & {
  location_city?: string | null;
  location_neighborhood?: string | null;
  host_id?: string | null;
  capacity?: number | null;
  start_time?: string | null;
  end_time?: string | null;
};

type UserBooking = { id: string; status: string };

/* ── Helpers ── */

function formatDate(iso: string): { month: string; day: string; full: string } {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  };
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

/* ── Info row ── */
function InfoRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function CampDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user } = useAuth();

  const [camp, setCamp] = useState<FullCamp | null>(null);
  const [loadingCamp, setLoadingCamp] = useState(true);
  const [campError, setCampError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [booking, setBooking] = useState<UserBooking | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  const [hostProfile, setHostProfile] = useState<{ preferred_first_name: string | null; legal_name: string | null; avatar_url: string | null } | null>(null);

  const { isFavorite, favoriteLoading, toggleFavorite } = useCampFavorite(camp?.id ?? null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoadingCamp(true);
      setCampError(null);
      const { data, error } = await supabase.from("camps").select("*").eq("slug", slug).maybeSingle();
      if (error || !data) { setCampError("We couldn't load this camp."); setLoadingCamp(false); return; }
      setCamp(data as FullCamp);
      setLoadingCamp(false);

      // Load host profile
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
      const confirmedRes = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("camp_id", camp.id).eq("status", "confirmed");
      if (!confirmedRes.error) setConfirmedCount(confirmedRes.count ?? null);
      if (user?.id) {
        const bookingRes = await supabase.from("bookings").select("id, status").eq("camp_id", camp.id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        setBooking(bookingRes.data ? (bookingRes.data as UserBooking) : null);
      }
    };
    void loadBookingInfo();
  }, [camp?.id, user?.id]);

  if (loadingCamp) {
    return (
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start animate-pulse">
            <div className="aspect-square rounded-3xl bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded-xl bg-muted" />
              <div className="h-4 w-1/2 rounded-lg bg-muted" />
              <div className="h-32 rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (campError || !camp) {
    return (
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <button type="button" className="mb-4 text-xs text-muted-foreground hover:text-foreground" onClick={() => router.back()}>← Back</button>
          <div className="rounded-2xl bg-card px-6 py-8">
            <p className="text-sm text-destructive">{campError || "We couldn't find that camp."}</p>
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
  const priceDisplay = pricingMeta?.display || price;

  // Host
  const hostName = hostProfile?.preferred_first_name || hostProfile?.legal_name || (meta?.host_name as string | undefined) || "Golly Host";
  const hostInitial = hostName.charAt(0).toUpperCase();

  // Dates
  const startDate = start_time ? formatDate(start_time) : null;
  const dateLabel = startDate
    ? `${startDate.full}${end_time ? ` – ${formatDate(end_time).full}` : ""}`
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
  const locationLine = isVirtual ? "Online event" : [location_neighborhood, location_city].filter(Boolean).join(", ");

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

  // Class schedule
  const classSchedule = meta?.classSchedule as {
    frequency?: string;
    duration?: string;
    studentsPerClass?: string;
    sessionLength?: string;
  } | undefined;

  // Camp sessions
  const campSessions = meta?.campSessions as Array<{
    id: string; startDate: string; endDate: string;
    startTime: string; endTime: string; capacity: string;
  }> | undefined;

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

  // Booking state
  const isHost = user?.id && host_id ? user.id === host_id : false;
  const now = new Date();
  const parsedEnd = end_time ? new Date(end_time) : start_time ? new Date(start_time) : null;
  const hasEnded = parsedEnd ? parsedEnd < now : false;
  const confirmed = typeof confirmedCount === "number" ? confirmedCount : 0;
  const totalCapacity = typeof capacity === "number" && capacity > 0 ? capacity : null;
  const isFull = totalCapacity != null ? confirmed >= totalCapacity : false;

  let statusVariant: "booked" | "full" | "ended" | null = null;
  if (hasEnded) statusVariant = "ended";
  else if (booking?.status === "confirmed") statusVariant = "booked";
  else if (isFull) statusVariant = "full";

  const spotsLeft = totalCapacity != null ? totalCapacity - confirmed : null;

  return (
    <main className="flex-1">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <button type="button" className="mb-6 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => router.back()}>
          ← Back
        </button>

        <div className="grid gap-10 lg:grid-cols-[360px_1fr] items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Main image */}
            <div className="relative overflow-hidden rounded-3xl bg-muted aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[selectedIdx]} alt={name} className="w-full h-full object-cover" />
              {/* Favorite button */}
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white transition-colors disabled:opacity-60"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-foreground"}`} />
              </button>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button key={i} type="button" onClick={() => setSelectedIdx(i)}
                    className={`flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden border-2 transition-colors ${i === selectedIdx ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Host card */}
            <Link
              href={host_id ? `/profile/${host_id}` : "#"}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                {hostProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hostProfile.avatar_url} alt={hostName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {hostInitial}
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground">Presented by</p>
                  <p className="text-sm font-medium text-foreground">{hostName}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

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
                    <Tag className="h-3 w-3" /> {category}
                  </span>
                )}
                {ageLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    <Baby className="h-3 w-3" /> {ageLabel}
                  </span>
                )}
                {experienceLevels.length > 0 && !experienceLevels.includes("all_levels") && (
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    {levelLabel(experienceLevels)}
                  </span>
                )}
              </div>
            )}

            {/* Host actions */}
            {isHost && (
              <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-foreground">
                <span className="font-medium">You manage this</span>
                <button onClick={() => router.push(`/host/activities/${id}`)} className="text-xs font-medium text-primary hover:text-primary/80">
                  Manage →
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-tight">
              {name}
            </h1>

            {/* Key info rows */}
            <div className="rounded-2xl bg-card px-5 divide-y divide-border">
              {/* Date */}
              {dateLabel && (
                <div className="flex items-start gap-4 py-3">
                  <div className="flex flex-col items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-muted text-center leading-none">
                    {startDate && (
                      <>
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">{startDate.month}</span>
                        <span className="text-base font-bold text-foreground">{startDate.day}</span>
                      </>
                    )}
                    {!startDate && <Calendar className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{dateLabel}</p>
                    {timeLabel && <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>}
                  </div>
                </div>
              )}

              {/* Location */}
              {locationLine && (
                <div className="flex items-start gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {isVirtual ? <Wifi className="h-4 w-4 text-muted-foreground" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isVirtual ? "Online event" : "In person"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{locationLine}</p>
                  </div>
                </div>
              )}

              {/* Capacity */}
              {totalCapacity != null && (
                <div className="flex items-start gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isFull ? "Fully booked" : spotsLeft === 1 ? "1 spot left" : `${spotsLeft} spots left`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{confirmed} of {totalCapacity} booked</p>
                  </div>
                </div>
              )}

              {/* Class schedule details */}
              {classSchedule?.frequency && (
                <div className="flex items-start gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{frequencyLabel(classSchedule.frequency)}</p>
                    {classSchedule.duration && <p className="text-xs text-muted-foreground mt-0.5">{classSchedule.duration} min per session</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="rounded-2xl bg-card px-5 py-5 space-y-3">
              {priceDisplay && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
                  <span className="text-sm text-muted-foreground">per {activityKind === "class" ? "class" : "session"}</span>
                </div>
              )}

              {statusVariant === null && (
                <>
                  <button
                    onClick={() => router.push(`/checkout/${id}`)}
                    className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Reserve a spot
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">You won't be charged yet.</p>
                </>
              )}
              {statusVariant === "booked" && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 text-center">
                  ✓ You're registered — see you there!
                </div>
              )}
              {statusVariant === "full" && (
                <div className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground text-center">
                  This session is full.
                </div>
              )}
              {statusVariant === "ended" && (
                <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground text-center">
                  This camp has ended.
                </div>
              )}
            </div>

            {/* Multiple sessions */}
            {campSessions && campSessions.length > 1 && (
              <div className="rounded-2xl bg-card px-5 py-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
                <div className="space-y-2">
                  {campSessions.map((session) => {
                    const sd = formatDate(session.startDate);
                    return (
                      <div key={session.id} className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-foreground">{sd.full}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeLocal(session.startTime)} – {formatTimeLocal(session.endTime)}
                          </p>
                        </div>
                        {session.capacity && (
                          <span className="text-xs text-muted-foreground">{session.capacity} spots</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About */}
            {description && (
              <div className="rounded-2xl bg-card px-5 py-5 space-y-2">
                <h2 className="text-sm font-semibold text-foreground">About this {activityKind || "camp"}</h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {description.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {campActivities && campActivities.length > 0 && (
              <div className="rounded-2xl bg-card px-5 py-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">What you&apos;ll do</h2>
                <div className="space-y-2.5">
                  {campActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2.5">
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                      <div>
                        {activity.title && (
                          <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        )}
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional details */}
            {additionalDetails && (
              <div className="rounded-2xl bg-card px-5 py-5 space-y-2">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> What to bring
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{additionalDetails}</p>
              </div>
            )}

            {/* Advanced options */}
            {(advanced?.earlyDropoff?.enabled || advanced?.extendedDay?.enabled || advanced?.siblingDiscount?.enabled) && (
              <div className="rounded-2xl bg-card px-5 py-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Add-ons & discounts</h2>
                <div className="space-y-2">
                  {advanced?.earlyDropoff?.enabled && (
                    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-2.5">
                      <Sunrise className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Early drop-off available</p>
                        {advanced.earlyDropoff.start && advanced.earlyDropoff.end && (
                          <p className="text-xs text-muted-foreground">
                            {formatTimeLocal(advanced.earlyDropoff.start)} – {formatTimeLocal(advanced.earlyDropoff.end)}
                            {advanced.earlyDropoff.price ? ` · ${advanced.earlyDropoff.price}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {advanced?.extendedDay?.enabled && (
                    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-2.5">
                      <Sunset className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Extended day available</p>
                        {advanced.extendedDay.start && advanced.extendedDay.end && (
                          <p className="text-xs text-muted-foreground">
                            {formatTimeLocal(advanced.extendedDay.start)} – {formatTimeLocal(advanced.extendedDay.end)}
                            {advanced.extendedDay.price ? ` · ${advanced.extendedDay.price}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {advanced?.siblingDiscount?.enabled && advanced.siblingDiscount.value && (
                    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-2.5">
                      <BadgePercent className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Sibling discount</p>
                        <p className="text-xs text-muted-foreground">
                          {advanced.siblingDiscount.type === "percent"
                            ? `${advanced.siblingDiscount.value}% off`
                            : `$${advanced.siblingDiscount.value} off`} for additional siblings
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation policy */}
            {cancellationPolicy && (
              <div className="rounded-2xl bg-card px-5 py-5 space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Cancellation policy</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{cancellationPolicy}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
