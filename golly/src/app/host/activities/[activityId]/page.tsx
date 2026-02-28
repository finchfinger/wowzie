"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getHeroImage, getGalleryImages } from "@/lib/images";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Calendar,
  Clock,
  MapPin,
  Users,
  Lock,
  Globe,
  DollarSign,
  Tag,
  Baby,
  ListChecks,
  Zap,
  Sunrise,
  Sunset,
  RefreshCcw,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  Video,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Activity = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  price_cents: number | null;
  is_published: boolean | null;
  is_active: boolean | null;
  status: string | null;
  hero_image_url: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  start_time: string | null;
  end_time: string | null;
  start_local: string | null;
  end_local: string | null;
  schedule_tz: string | null;
  meta: any;
};

type BookingStatus = "pending" | "confirmed" | "declined" | "waitlisted";

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  age_years: number | null;
  avatar_emoji: string | null;
};

type CampBookingRow = {
  id: string;
  camp_id: string;
  parent_id: string;
  child_id: string | null;
  status: BookingStatus;
  created_at: string;
  child: Child | null;
};

const ACTIVITY_COLUMNS = `
  id, slug, name, description, location, capacity,
  price_cents, is_published, is_active, status,
  hero_image_url, image_url, image_urls,
  start_time, end_time, start_local, end_local, schedule_tz,
  meta
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function deriveDateRange(a: Activity) {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.start_time || a.end_time) {
    const s = a.start_time ? new Date(a.start_time) : null;
    const e = a.end_time ? new Date(a.end_time) : null;
    if (s && e) {
      const sl = formatDate(s, tz);
      const el = formatDate(e, tz);
      return { heading: sl !== el ? "Dates" : "Date", value: sl !== el ? `${sl} – ${el}` : sl };
    }
    if (s) return { heading: "Date", value: formatDate(s, tz) };
    if (e) return { heading: "Date", value: formatDate(e, tz) };
  }
  const fixed = a.meta?.fixedSchedule || {};
  const sm = fixed.startDate as string | undefined;
  const em = fixed.endDate as string | undefined;
  if (!sm && !em) return { heading: "Date", value: null };
  const s = sm ? new Date(sm) : null;
  const e = em ? new Date(em) : null;
  if (s && e) {
    const sl = formatDate(s, tz);
    const el = formatDate(e, tz);
    return { heading: sl !== el ? "Dates" : "Date", value: sl !== el ? `${sl} – ${el}` : sl };
  }
  if (s) return { heading: "Date", value: formatDate(s, tz) };
  if (e) return { heading: "Date", value: formatDate(e, tz) };
  return { heading: "Date", value: null };
}

function deriveTimeLabel(a: Activity): string | null {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.meta?.fixedSchedule?.allDay) return "All day";
  if (a.start_time && a.end_time) {
    return `${formatTime(new Date(a.start_time), tz)} – ${formatTime(new Date(a.end_time), tz)}`;
  }
  if (a.start_time) return formatTime(new Date(a.start_time), tz);
  const fs = a.meta?.fixedSchedule;
  if (fs?.startTime && fs?.endTime) {
    const toP = (v: string) => {
      const [h, m] = v.split(":").map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return formatTime(d);
    };
    return `${toP(fs.startTime)} – ${toP(fs.endTime)}`;
  }
  return null;
}

function computeAge(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString();
}

function deriveCampSessionLabel(session: any): string {
  const parts: string[] = [];
  if (session.name) parts.push(session.name);
  if (session.startDate && session.endDate) {
    parts.push(`${session.startDate} – ${session.endDate}`);
  } else if (session.startDate) {
    parts.push(session.startDate);
  }
  if (session.spots) parts.push(`${session.spots} spots`);
  if (session.price_cents) parts.push(`$${(session.price_cents / 100).toFixed(0)}`);
  return parts.join(" · ");
}

function deriveAgeLabel(meta: any): string | null {
  const buckets: string[] = Array.isArray(meta?.age_buckets) ? meta.age_buckets : [];
  if (buckets.length) return buckets.join(", ");
  const bucket = meta?.age_bucket;
  if (bucket && bucket !== "all") return bucket;
  const min = meta?.min_age;
  const max = meta?.max_age;
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  if (max != null) return `Up to age ${max}`;
  return null;
}

function formatMoney(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* ------------------------------------------------------------------ */
/* Inline ActionsMenu                                                 */
/* ------------------------------------------------------------------ */

type ActionItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
};

function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg z-20 overflow-hidden" role="menu">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                item.disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : item.tone === "destructive"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent"
              }`}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delete Modal                                                       */
/* ------------------------------------------------------------------ */

function DeleteEventModal({
  open,
  title,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-sm font-semibold text-foreground">Delete event?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This will permanently delete <span className="font-medium">{title}</span>. This cannot be undone.
        </p>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small reusable overview pieces                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab types                                                          */
/* ------------------------------------------------------------------ */

type TabId = "overview" | "guests" | "more";

/* ------------------------------------------------------------------ */
/* Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ActivityDetailPage() {
  const params = useParams<{ activityId: string }>();
  const router = useRouter();
  const activityId = params.activityId;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Guests state
  const [guests, setGuests] = useState<CampBookingRow[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [registrations, setRegistrations] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Delete state
  const [busyAction, setBusyAction] = useState<"duplicate" | "delete" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add guest modal
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from("camps")
        .select(ACTIVITY_COLUMNS)
        .eq("id", activityId)
        .single();
      if (!alive) return;
      if (dbError || !data) {
        setError("Could not load this activity.");
        setLoading(false);
        return;
      }
      setActivity(data as Activity);
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [activityId]);

  // Load guests + registration count
  useEffect(() => {
    if (!activity?.id) return;
    let alive = true;

    const loadGuests = async () => {
      setGuestsLoading(true);
      const { data } = await supabase
        .from("camp_bookings")
        .select(`
          id, camp_id, parent_id, child_id, status, created_at,
          child:children!camp_bookings_child_id_fkey (
            id, legal_name, preferred_name, birthdate, age_years, avatar_emoji
          )
        `)
        .eq("camp_id", activity.id)
        .not("child_id", "is", null)
        .order("created_at", { ascending: false })
        .returns<CampBookingRow[]>();

      if (!alive) return;
      setGuests(data ?? []);
      setGuestsLoading(false);
    };

    const loadCount = async () => {
      const { count } = await supabase
        .from("camp_bookings")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", activity.id)
        .neq("status", "declined");
      if (alive) setRegistrations(count ?? 0);
    };

    void loadGuests();
    void loadCount();
    return () => { alive = false; };
  }, [activity?.id]);

  const filteredGuests = useMemo(() => {
    if (statusFilter === "all") return guests;
    return guests.filter((g) => g.status === statusFilter);
  }, [guests, statusFilter]);

  const handleEdit = () => router.push(`/host/activities/${activityId}/edit`);
  const handleEventPage = () => {
    if (activity?.slug) router.push(`/camp/${activity.slug}`);
  };

  const handleDuplicate = async () => {
    if (!activity || busyAction) return;
    setBusyAction("duplicate");
    try {
      const slug = `${(activity.slug || activity.name || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error: insertErr } = await supabase
        .from("camps")
        .insert({
          slug,
          name: `(Copy) ${activity.name}`,
          description: activity.description,
          location: activity.location,
          capacity: activity.capacity,
          price_cents: activity.price_cents,
          hero_image_url: activity.hero_image_url,
          image_url: activity.image_url,
          image_urls: activity.image_urls,
          meta: activity.meta ?? {},
          is_published: false,
          is_active: true,
          status: "active",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      if (data?.id) router.push(`/host/activities/${data.id}/edit`);
    } catch (e) {
      console.error("Duplicate failed:", e);
      setError("Could not duplicate listing.");
    } finally {
      setBusyAction(null);
    }
  };

  const confirmDelete = async () => {
    if (busyAction) return;
    setBusyAction("delete");
    setDeleteError(null);
    try {
      const { error: delErr } = await supabase.from("camps").delete().eq("id", activityId);
      if (delErr) throw delErr;
      setDeleteOpen(false);
      router.push("/host/listings");
    } catch (e: any) {
      setDeleteError(e?.message ?? "Could not delete this event.");
    } finally {
      setBusyAction(null);
    }
  };

  const updateGuestStatus = async (bookingId: string, status: BookingStatus) => {
    setGuests((prev) => prev.map((g) => (g.id === bookingId ? { ...g, status } : g)));
    const { error } = await supabase
      .from("camp_bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    if (error) {
      setGuests((prev) => prev.map((g) => (g.id === bookingId ? { ...g, status: "pending" } : g)));
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading activity…</div>;
  }

  if (error || !activity) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive mb-4">{error || "Activity not found."}</p>
        <Button variant="outline" onClick={() => router.push("/host/listings")}>Back to listings</Button>
      </div>
    );
  }

  /* Derived values */
  const meta = activity.meta ?? {};
  const dateRange = deriveDateRange(activity);
  const timeValue = deriveTimeLabel(activity);
  const priceValue = formatMoney(activity.price_cents);
  const isPublished = meta.visibility === "public" || (meta.visibility == null && activity.is_published);
  const isVirtual = Boolean(meta.isVirtual);
  const capacityLabel = activity.capacity != null ? `${registrations} / ${activity.capacity}` : `${registrations}`;
  const ageLabel = deriveAgeLabel(meta);
  const heroUrl = getHeroImage(activity);
  const galleryUrls = getGalleryImages(activity, { includeHero: false, max: 8 });
  const allPhotos = heroUrl ? [heroUrl, ...galleryUrls] : galleryUrls;

  /* Meta sections */
  const campSessions: any[] = Array.isArray(meta.campSessions) ? meta.campSessions : [];
  const activities: any[] = Array.isArray(meta.activities) ? meta.activities.filter((a: any) => a.title) : [];
  const advanced = meta.advanced ?? {};
  const earlyDropoff = advanced.earlyDropoff ?? {};
  const extendedDay = advanced.extendedDay ?? {};
  const siblingDiscount = advanced.siblingDiscount ?? {};
  const hasAddOns = earlyDropoff.enabled || extendedDay.enabled || siblingDiscount.enabled;
  const cancellationPolicy = meta.cancellation_policy;
  const activityKind: string = meta.activityKind ?? "camp";

  /* Pending count for guest badge */
  const pendingCount = guests.filter((g) => g.status === "pending").length;

  const tabs: Array<{ id: TabId; label: string; badge?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests", badge: pendingCount || undefined },
    { id: "more", label: "More" },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <Link href="/host/listings" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to listings
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-semibold text-foreground">{activity.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isPublished
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {isPublished ? "Published" : "Draft"}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
              {activityKind}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handleEdit}>Edit listing</Button>
          <ActionsMenu
            items={[
              { label: "View event page", onSelect: handleEventPage, disabled: !activity.slug },
              { label: busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing", onSelect: handleDuplicate },
              { label: "Delete event", tone: "destructive", onSelect: () => { setDeleteError(null); setDeleteOpen(true); } },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <nav className="mb-5 border-b border-border flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-1 pb-2.5 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
            {tab.badge ? (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ---- LEFT / MAIN COLUMN ---- */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero image */}
            {heroUrl && (
              <div className="overflow-hidden rounded-2xl border border-border aspect-video bg-muted">
                <img
                  src={heroUrl}
                  alt={activity.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <SectionHeading>Description</SectionHeading>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {activity.description}
                </p>
              </div>
            )}

            {/* Camp Sessions */}
            {campSessions.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <SectionHeading>Sessions ({campSessions.length})</SectionHeading>
                <div className="space-y-2">
                  {campSessions.map((session: any, i: number) => {
                    const label = deriveCampSessionLabel(session);
                    const spotsLeft = session.spots != null ? session.spots - (session.registered ?? 0) : null;
                    return (
                      <div key={session.id ?? i} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {session.name || `Session ${i + 1}`}
                          </p>
                          {(session.startDate || session.endDate) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {session.startDate}{session.endDate && session.endDate !== session.startDate ? ` – ${session.endDate}` : ""}
                            </p>
                          )}
                          {session.startTime && session.endTime && (
                            <p className="text-xs text-muted-foreground">
                              {session.startTime} – {session.endTime}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {session.price_cents != null && (
                            <p className="text-sm font-semibold text-foreground">
                              ${(session.price_cents / 100).toFixed(0)}
                            </p>
                          )}
                          {session.spots != null && (
                            <p className="text-[11px] text-muted-foreground">
                              {spotsLeft != null ? `${spotsLeft} spots left` : `${session.spots} spots`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activities / Itinerary */}
            {activities.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <SectionHeading>What you&apos;ll do</SectionHeading>
                <div className="space-y-3">
                  {activities.map((act: any, i: number) => (
                    <div key={act.id ?? i} className="flex gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{act.title}</p>
                        {act.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {hasAddOns && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <SectionHeading>Add-ons</SectionHeading>
                <div className="space-y-0">
                  {earlyDropoff.enabled && (
                    <DetailRow
                      icon={<Sunrise className="h-3.5 w-3.5" />}
                      label="Early drop-off"
                      value={[
                        earlyDropoff.start && earlyDropoff.end ? `${earlyDropoff.start} – ${earlyDropoff.end}` : null,
                        earlyDropoff.price ? `$${earlyDropoff.price}` : null,
                      ].filter(Boolean).join(" · ") || "Enabled"}
                    />
                  )}
                  {extendedDay.enabled && (
                    <DetailRow
                      icon={<Sunset className="h-3.5 w-3.5" />}
                      label="Extended day"
                      value={[
                        extendedDay.start && extendedDay.end ? `${extendedDay.start} – ${extendedDay.end}` : null,
                        extendedDay.price ? `$${extendedDay.price}` : null,
                      ].filter(Boolean).join(" · ") || "Enabled"}
                    />
                  )}
                  {siblingDiscount.enabled && (
                    <DetailRow
                      icon={<RefreshCcw className="h-3.5 w-3.5" />}
                      label="Sibling discount"
                      value={siblingDiscount.type === "percent"
                        ? `${siblingDiscount.value ?? "—"}% off`
                        : siblingDiscount.type === "amount"
                          ? `$${siblingDiscount.value ?? "—"} off`
                          : "Enabled"}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Photo gallery strip */}
            {allPhotos.length > 1 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeading>Photos ({allPhotos.length})</SectionHeading>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {allPhotos.slice(0, 8).map((url, i) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                    >
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- RIGHT / SIDEBAR COLUMN ---- */}
          <div className="space-y-4">

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Price"
                value={priceValue ?? "—"}
                sub="per child"
              />
              <StatCard
                label="Registrations"
                value={capacityLabel}
                sub={activity.capacity != null ? "filled" : "signed up"}
              />
              {ageLabel && (
                <StatCard
                  label="Age range"
                  value={ageLabel}
                />
              )}
            </div>

            {/* Listing details */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <SectionHeading>Details</SectionHeading>
              <div>
                {dateRange.value && (
                  <DetailRow
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label={dateRange.heading}
                    value={dateRange.value}
                  />
                )}
                {timeValue && (
                  <DetailRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Time"
                    value={timeValue}
                  />
                )}
                {isVirtual ? (
                  <DetailRow
                    icon={<Video className="h-3.5 w-3.5" />}
                    label="Format"
                    value={meta.meetingUrl ? "Virtual (link set)" : "Virtual"}
                  />
                ) : activity.location ? (
                  <DetailRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="Location"
                    value={activity.location}
                  />
                ) : null}
                <DetailRow
                  icon={isPublished ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  label="Visibility"
                  value={isPublished ? "Public" : "Draft"}
                />
                {meta.category && (
                  <DetailRow
                    icon={<Tag className="h-3.5 w-3.5" />}
                    label="Category"
                    value={meta.category}
                  />
                )}
                {ageLabel && (
                  <DetailRow
                    icon={<Baby className="h-3.5 w-3.5" />}
                    label="Ages"
                    value={ageLabel}
                  />
                )}
              </div>
            </div>

            {/* Cancellation policy */}
            {cancellationPolicy && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <SectionHeading>Cancellation</SectionHeading>
                <p className="text-sm text-foreground">{cancellationPolicy}</p>
              </div>
            )}

            {/* Listing URL */}
            {activity.slug && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <SectionHeading>Listing URL</SectionHeading>
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-xs text-muted-foreground">
                    /camp/{activity.slug}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}/camp/${activity.slug}`);
                    }}
                    className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <button
                type="button"
                onClick={handleEdit}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                Edit listing
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guests")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  View guests
                  {pendingCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {activity.slug && (
                <button
                  type="button"
                  onClick={handleEventPage}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  View event page
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== GUESTS TAB ===== */}
      {activeTab === "guests" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {["all", "pending", "confirmed", "declined", "waitlisted"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1.5 text-xs border ${
                    statusFilter === s
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-input hover:bg-gray-50"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === "pending" && pendingCount > 0 && ` (${pendingCount})`}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setAddGuestOpen(true)}>
              Add guest
            </Button>
          </div>

          <div className="space-y-1">
            {guestsLoading ? (
              <div className="py-8 text-xs text-muted-foreground">Loading guests…</div>
            ) : filteredGuests.length === 0 ? (
              <div className="py-8 text-xs text-muted-foreground">No guests yet.</div>
            ) : (
              filteredGuests.map((g) => {
                const name = g.child?.preferred_name?.trim() || g.child?.legal_name?.trim() || "Guest";
                const age = g.child?.age_years ?? computeAge(g.child?.birthdate);
                const emoji = g.child?.avatar_emoji || "🙂";
                const isPending = g.status === "pending";

                return (
                  <div key={g.id} className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
                    <Link
                      href={`/host/activities/${activityId}/guests/${g.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-[13px] shrink-0">
                        {emoji}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{age != null ? `Age ${age}` : "Age —"}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-4 shrink-0">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={(e) => { e.preventDefault(); updateGuestStatus(g.id, "declined"); }} className="text-xs text-destructive hover:text-destructive/80">Decline</button>
                          <button type="button" onClick={(e) => { e.preventDefault(); updateGuestStatus(g.id, "confirmed"); }} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600">Approve</button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{g.status}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{whenLabel(g.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add guest modal */}
          {addGuestOpen && (
            <div className="fixed inset-0 z-50">
              <button type="button" aria-label="Close" onClick={() => setAddGuestOpen(false)} className="absolute inset-0 bg-black/30" />
              <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg">
                <p className="text-sm font-semibold text-foreground">Add guest</p>
                <p className="mt-1 text-xs text-muted-foreground">Placeholder UI for adding guests.</p>
                <div className="mt-5 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAddGuestOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MORE TAB ===== */}
      {activeTab === "more" && (
        <section className="space-y-8 max-w-3xl">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Duplicate listing</h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Create a new event with the same information as this one.
            </p>
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={busyAction === "duplicate"}>
              {busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing"}
            </Button>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Event page</h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Share your event URL with families so they can register.
            </p>
            {activity.slug && (
              <div className="flex items-center gap-2 rounded-2xl bg-muted p-3">
                <p className="text-xs text-muted-foreground flex-1 truncate">
                  /camp/{activity.slug}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}/camp/${activity.slug}`);
                  }}
                >
                  Copy link
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-destructive">Cancel Event</h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Cancel and permanently delete this event. This cannot be undone.
            </p>
            <Button variant="destructive" size="sm" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>
              Cancel Event
            </Button>
          </div>
        </section>
      )}

      <DeleteEventModal
        open={deleteOpen}
        title={activity.name}
        deleting={busyAction === "delete"}
        error={deleteError}
        onClose={() => { if (busyAction !== "delete") setDeleteOpen(false); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
