"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getHeroImage } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoRow } from "@/components/host/InfoRow";
import { MoreHorizontal } from "lucide-react";

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
  if (!sm && !em) return { heading: "Date", value: "Date to be announced" };
  const s = sm ? new Date(sm) : null;
  const e = em ? new Date(em) : null;
  if (s && e) {
    const sl = formatDate(s, tz);
    const el = formatDate(e, tz);
    return { heading: sl !== el ? "Dates" : "Date", value: sl !== el ? `${sl} – ${el}` : sl };
  }
  if (s) return { heading: "Date", value: formatDate(s, tz) };
  if (e) return { heading: "Date", value: formatDate(e, tz) };
  return { heading: "Date", value: "Date to be announced" };
}

function deriveTimeLabel(a: Activity) {
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
  return "Time to be announced";
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

  const dateRange = deriveDateRange(activity);
  const timeValue = deriveTimeLabel(activity);
  const priceValue = activity.price_cents != null ? `$${(activity.price_cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$—";
  const listingType = activity.meta?.visibility === "public" ? "Public" : activity.meta?.visibility === "private" ? "Private" : activity.is_published ? "Public" : "Private";
  const capacityLabel = activity.capacity != null ? `${registrations} of ${activity.capacity}` : `${registrations}`;

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests" },
    { id: "more", label: "More" },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <Link href="/host/listings" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to listings
          </Link>
          <h1 className="text-xl font-semibold text-foreground mt-1">{activity.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>Edit listing</Button>
          <ActionsMenu
            items={[
              { label: "Event page", onSelect: handleEventPage, disabled: !activity.slug },
              { label: busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing", onSelect: handleDuplicate },
              { label: "Delete event", tone: "destructive", onSelect: () => { setDeleteError(null); setDeleteOpen(true); } },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <nav className="mb-4 border-b border-border flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center px-1 pb-2 text-sm border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="rounded-2xl bg-card px-4 sm:px-6 py-5">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <section className="pt-2">
            <div className="grid gap-8 md:grid-cols-2 text-sm">
              <div className="space-y-4">
                <InfoRow icon={<span className="text-base">📅</span>} label={dateRange.heading} value={dateRange.value} />
                <InfoRow icon={<span className="text-base">⏰</span>} label="Time" value={timeValue} />
                <InfoRow icon={<span className="text-base">$</span>} label="Price per child" value={priceValue} />
              </div>
              <div className="space-y-4">
                <InfoRow icon={<span className="text-base">📍</span>} label="Location" value={activity.location || "Location to be announced"} />
                <InfoRow icon={<span className="text-base">👨‍👩‍👧‍👦</span>} label="Registrations" value={capacityLabel} />
                <InfoRow icon={<span className="text-base">🔒</span>} label="Listing type" value={listingType} />
              </div>
            </div>
          </section>
        )}

        {/* GUESTS */}
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
                    <div key={g.id} className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-[13px]">
                          {emoji}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">{age != null ? `Age ${age}` : "Age —"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => updateGuestStatus(g.id, "declined")} className="text-xs text-destructive hover:text-destructive/80">Decline</button>
                            <button type="button" onClick={() => updateGuestStatus(g.id, "confirmed")} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600">Approve</button>
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

        {/* MORE */}
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
                <div className="flex items-center gap-2 rounded-2xl bg-card p-3">
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
      </div>

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
