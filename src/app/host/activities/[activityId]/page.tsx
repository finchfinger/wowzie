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
  Baby,
  Sunrise,
  Sunset,
  RefreshCcw,
  Tag,
  Video,
  MessageSquare,
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

type CampBookingRow = {
  id: string;
  camp_id: string;
  user_id: string;
  status: BookingStatus;
  created_at: string;
  guests_count: number;
  contact_email: string | null;
  /* hydrated client-side from profiles */
  parentName?: string | null;
  parentEmail?: string | null;
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
    month: "long", day: "numeric", year: "numeric", timeZone: tz,
  }).format(d);
}

function formatTime(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: tz,
  }).format(d);
}

function deriveDateRange(a: Activity) {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.start_time || a.end_time) {
    const s = a.start_time ? new Date(a.start_time) : null;
    const e = a.end_time ? new Date(a.end_time) : null;
    if (s && e) {
      const sl = formatDate(s, tz); const el = formatDate(e, tz);
      return { heading: sl !== el ? "Dates" : "Date", value: sl !== el ? `${sl} – ${el}` : sl };
    }
    if (s) return { heading: "Date", value: formatDate(s, tz) };
    if (e) return { heading: "Date", value: formatDate(e, tz) };
  }
  const fixed = a.meta?.fixedSchedule || {};
  const sm = fixed.startDate as string | undefined;
  const em = fixed.endDate as string | undefined;
  if (!sm && !em) return null;
  const s = sm ? new Date(sm) : null;
  const e = em ? new Date(em) : null;
  if (s && e) {
    const sl = formatDate(s, tz); const el = formatDate(e, tz);
    return { heading: sl !== el ? "Dates" : "Date", value: sl !== el ? `${sl} – ${el}` : sl };
  }
  if (s) return { heading: "Date", value: formatDate(s, tz) };
  if (e) return { heading: "Date", value: formatDate(e, tz) };
  return null;
}

function deriveTimeLabel(a: Activity): string | null {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.meta?.fixedSchedule?.allDay) return "All day";
  if (a.start_time && a.end_time)
    return `${formatTime(new Date(a.start_time), tz)} – ${formatTime(new Date(a.end_time), tz)}`;
  if (a.start_time) return formatTime(new Date(a.start_time), tz);
  const fs = a.meta?.fixedSchedule;
  if (fs?.startTime && fs?.endTime) {
    const toP = (v: string) => {
      const [h, m] = v.split(":").map(Number);
      const d = new Date(); d.setHours(h || 0, m || 0, 0, 0);
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
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString();
}

function deriveAgeLabel(meta: any): string | null {
  const buckets: string[] = Array.isArray(meta?.age_buckets) ? meta.age_buckets : [];
  if (buckets.length) return buckets.join(", ");
  const bucket = meta?.age_bucket;
  if (bucket && bucket !== "all") return bucket;
  const min = meta?.min_age; const max = meta?.max_age;
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
/* Attendance helpers                                                 */
/* ------------------------------------------------------------------ */

type AttendanceRecord = {
  id: string;
  booking_id: string;
  child_id: string | null;
  child_name: string;
  date: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
};

type RosterEntry = {
  bookingId: string;
  parentName: string;
  childId: string | null;
  childName: string;
  emoji: string | null;
  attendanceRecord: AttendanceRecord | null;
};

function deriveCampDays(activity: Activity): string[] {
  const meta = activity.meta ?? {};
  const sessions: any[] = Array.isArray(meta.campSessions) ? meta.campSessions : [];
  const days = new Set<string>();
  const addRange = (startStr: string, endStr?: string) => {
    const cur = new Date(startStr + "T12:00:00");
    const end = endStr ? new Date(endStr + "T12:00:00") : new Date(startStr + "T12:00:00");
    while (cur <= end) { days.add(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  };
  if (sessions.length > 0) {
    for (const s of sessions) { if (s.startDate) addRange(s.startDate, s.endDate); }
    if (days.size > 0) return Array.from(days).sort();
  }
  const fs = meta.fixedSchedule ?? {};
  if (fs.startDate) { addRange(fs.startDate, fs.endDate); return Array.from(days).sort(); }
  if (activity.start_time) {
    addRange(activity.start_time.slice(0, 10), activity.end_time?.slice(0, 10));
    return Array.from(days).sort();
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions menu                                                       */
/* ------------------------------------------------------------------ */

type ActionItem = { label: string; onSelect: () => void; tone?: "default" | "destructive"; disabled?: boolean; };

function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen(p => !p)} aria-haspopup="menu" aria-expanded={open} aria-label="More actions"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg z-20 overflow-hidden" role="menu">
          {items.map((item, idx) => (
            <button key={idx} type="button" role="menuitem" disabled={item.disabled}
              className={`block w-full px-3 py-2.5 text-left text-xs transition-colors ${item.disabled ? "text-muted-foreground/40 cursor-not-allowed" : item.tone === "destructive" ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"}`}
              onClick={() => { if (item.disabled) return; item.onSelect(); setOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delete modal                                                       */
/* ------------------------------------------------------------------ */

function DeleteModal({ open, title, deleting, error, onClose, onConfirm }: { open: boolean; title: string; deleting: boolean; error: string | null; onClose: () => void; onConfirm: () => void; }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-sm font-semibold">Delete event?</p>
        <p className="mt-1 text-xs text-muted-foreground">Permanently delete <span className="font-medium">{title}</span>. Cannot be undone.</p>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance Tab                                                     */
/* ------------------------------------------------------------------ */

function AttendanceTab({ activity }: { activity: Activity }) {
  const campId = activity.id;
  const campDays = useMemo(() => deriveCampDays(activity), [activity]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDay = campDays.includes(todayStr) ? todayStr : (campDays[0] ?? "");

  const [selectedDate, setSelectedDate] = useState(defaultDay);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [datesWithAttendance, setDatesWithAttendance] = useState<Set<string>>(new Set());

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!campId) return;
    void supabase
      .from("attendance").select("date").eq("camp_id", campId).not("checked_in_at", "is", null)
      .then(({ data }) => setDatesWithAttendance(new Set((data ?? []).map((r: any) => r.date as string))));
  }, [campId]);

  useEffect(() => {
    if (!campId || !selectedDate) return;
    let alive = true;
    setRosterLoading(true);
    void (async () => {
      const { data: bookings } = await supabase
        .from("bookings").select("id, user_id, guests_count, contact_email")
        .eq("camp_id", campId).eq("status", "confirmed");
      if (!alive) return;
      if (!bookings?.length) { setRoster([]); setRosterLoading(false); return; }

      const userIds = [...new Set((bookings as any[]).map((b: any) => b.user_id as string))];
      const [{ data: children }, { data: profiles }, { data: attRows }] = await Promise.all([
        supabase.from("children").select("id, legal_name, preferred_name, avatar_emoji, parent_id").in("parent_id", userIds),
        supabase.from("profiles").select("id, legal_name, preferred_first_name").in("id", userIds),
        supabase.from("attendance").select("id, booking_id, child_id, child_name, date, checked_in_at, checked_out_at").eq("camp_id", campId).eq("date", selectedDate),
      ]);
      if (!alive) return;

      const profileMap = new Map(((profiles ?? []) as any[]).map((p: any) => [p.id, p]));
      const attMap = new Map(((attRows ?? []) as any[]).map((a: any) => [`${a.booking_id}-${a.child_id ?? "null"}`, a as AttendanceRecord]));

      const entries: RosterEntry[] = [];
      for (const booking of (bookings as any[])) {
        const p = profileMap.get(booking.user_id) as any;
        const parentName = p?.preferred_first_name
          ? `${p.preferred_first_name} ${p.legal_name ?? ""}`.trim()
          : p?.legal_name ?? booking.contact_email ?? "Parent";
        const kids = ((children ?? []) as any[]).filter((c: any) => c.parent_id === booking.user_id);
        for (const child of kids) {
          entries.push({
            bookingId: booking.id, parentName,
            childId: child.id,
            childName: child.preferred_name || child.legal_name || "Child",
            emoji: child.avatar_emoji ?? null,
            attendanceRecord: attMap.get(`${booking.id}-${child.id}`) ?? null,
          });
        }
        const anonymous = (booking.guests_count ?? 0) - kids.length;
        for (let i = 0; i < anonymous; i++) {
          entries.push({
            bookingId: booking.id, parentName, childId: null,
            childName: `${parentName}'s child`, emoji: null,
            attendanceRecord: attMap.get(`${booking.id}-null`) ?? null,
          });
        }
      }
      setRoster(entries);
      setRosterLoading(false);
    })();
    return () => { alive = false; };
  }, [campId, selectedDate]);

  const handleCheckIn = async (entry: RosterEntry, idx: number) => {
    setBusyIdx(idx);
    const now = new Date().toISOString();
    if (entry.attendanceRecord?.id) {
      await supabase.from("attendance").update({ checked_in_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
      setRoster(prev => prev.map((r, i) => i === idx ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: now } } : r));
    } else {
      const { data: newRec } = await supabase.from("attendance").insert({
        camp_id: campId, booking_id: entry.bookingId, child_id: entry.childId,
        child_name: entry.childName, date: selectedDate, checked_in_at: now, marked_by: currentUserId,
      }).select("id, booking_id, child_id, child_name, date, checked_in_at, checked_out_at").single();
      if (newRec) setRoster(prev => prev.map((r, i) => i === idx ? { ...r, attendanceRecord: newRec as AttendanceRecord } : r));
      setDatesWithAttendance(prev => new Set([...prev, selectedDate]));
    }
    setBusyIdx(null);
  };

  const handleCheckOut = async (entry: RosterEntry, idx: number) => {
    if (!entry.attendanceRecord?.id) return;
    setBusyIdx(idx);
    const now = new Date().toISOString();
    await supabase.from("attendance").update({ checked_out_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map((r, i) => i === idx ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_out_at: now } } : r));
    setBusyIdx(null);
  };

  const handleUndo = async (entry: RosterEntry, idx: number) => {
    if (!entry.attendanceRecord?.id) return;
    setBusyIdx(idx);
    await supabase.from("attendance").update({ checked_in_at: null, checked_out_at: null, marked_by: null }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map((r, i) => i === idx ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: null, checked_out_at: null } } : r));
    setBusyIdx(null);
  };

  if (campDays.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No dates configured for this camp yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Add session dates in the camp editor.</p>
      </div>
    );
  }

  const checkedInCount = roster.filter(r => r.attendanceRecord?.checked_in_at).length;

  return (
    <div className="space-y-4">

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {campDays.map(day => {
          const d = new Date(day + "T12:00:00");
          const isSelected = day === selectedDate;
          const isToday = day === todayStr;
          const hasData = datesWithAttendance.has(day);
          return (
            <button key={day} type="button" onClick={() => setSelectedDate(day)}
              className={`relative flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] border transition-colors
                ${isSelected ? "bg-foreground text-background border-foreground"
                  : isToday ? "border-primary/60 text-primary"
                  : "border-border text-foreground hover:bg-muted"}`}>
              <span className="text-[11px] font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="text-sm font-semibold leading-tight">{d.getDate()}</span>
              <span className={`text-[10px] ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                {d.toLocaleDateString("en-US", { month: "short" })}
              </span>
              {hasData && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Date heading + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        {!rosterLoading && roster.length > 0 && (
          <p className="text-xs text-muted-foreground">{checkedInCount} / {roster.length} checked in</p>
        )}
      </div>

      {/* Roster */}
      {rosterLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Loading roster…</div>
      ) : roster.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">No confirmed registrations yet.</div>
      ) : (
        <div className="space-y-1.5">
          {roster.map((entry, idx) => {
            const busy = busyIdx === idx;
            const att = entry.attendanceRecord;
            const isIn = Boolean(att?.checked_in_at);
            const isOut = Boolean(att?.checked_out_at);
            return (
              <div key={idx} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
                <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xl
                  ${isIn ? "bg-emerald-50 ring-2 ring-emerald-200" : "bg-muted"}`}>
                  {entry.emoji
                    ? entry.emoji
                    : <span className="text-base font-semibold text-muted-foreground">{entry.childName.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{entry.childName}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.parentName}</p>
                  {isIn && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      In {formatTime(new Date(att!.checked_in_at!))}
                      {isOut && <span className="text-muted-foreground"> · Out {formatTime(new Date(att!.checked_out_at!))}</span>}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {!isIn && (
                    <button type="button" disabled={busy} onClick={() => void handleCheckIn(entry, idx)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                      {busy ? "…" : "Check in"}
                    </button>
                  )}
                  {isIn && !isOut && (
                    <>
                      <button type="button" disabled={busy} onClick={() => void handleCheckOut(entry, idx)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-40 transition-colors">
                        {busy ? "…" : "Check out"}
                      </button>
                      <button type="button" disabled={busy} onClick={() => void handleUndo(entry, idx)} title="Undo check-in"
                        className="h-7 w-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 text-xs transition-colors">
                        ↩
                      </button>
                    </>
                  )}
                  {isIn && isOut && (
                    <span className="text-xs font-medium text-muted-foreground">Done ✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab types                                                          */
/* ------------------------------------------------------------------ */

type TabId = "overview" | "guests" | "attendance" | "more";

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

  const [guests, setGuests] = useState<CampBookingRow[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [registrations, setRegistrations] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [busyAction, setBusyAction] = useState<"duplicate" | "delete" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase.from("camps").select(ACTIVITY_COLUMNS).eq("id", activityId).single();
      if (!alive) return;
      if (dbError || !data) { setError("Could not load this activity."); setLoading(false); return; }
      setActivity(data as Activity);
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [activityId]);

  useEffect(() => {
    if (!activity?.id) return;
    let alive = true;
    const loadGuests = async () => {
      setGuestsLoading(true);
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, camp_id, user_id, status, created_at, guests_count, contact_email")
        .eq("camp_id", activity.id)
        .not("status", "in", "(cancelled,expired)")
        .order("created_at", { ascending: false });
      if (!alive) return;

      const rows: CampBookingRow[] = (bookingRows ?? []) as CampBookingRow[];

      /* hydrate parent names from profiles */
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, legal_name, preferred_first_name, email")
          .in("id", userIds);
        const profileMap = new Map(
          ((profileRows ?? []) as any[]).map((p) => [p.id, p])
        );
        for (const row of rows) {
          const p = profileMap.get(row.user_id) as any;
          if (p) {
            row.parentName = p.preferred_first_name
              ? `${p.preferred_first_name} ${p.legal_name ?? ""}`.trim()
              : p.legal_name ?? null;
            row.parentEmail = p.email ?? row.contact_email ?? null;
          } else {
            row.parentEmail = row.contact_email ?? null;
          }
        }
      }

      setGuests(rows);
      setGuestsLoading(false);
    };
    const loadCount = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", activity.id)
        .in("status", ["confirmed", "pending"]);
      if (alive) setRegistrations(count ?? 0);
    };
    void loadGuests(); void loadCount();
    return () => { alive = false; };
  }, [activity?.id]);

  const filteredGuests = useMemo(() => statusFilter === "all" ? guests : guests.filter(g => g.status === statusFilter), [guests, statusFilter]);

  const handleEdit = () => router.push(`/host/activities/${activityId}/edit`);

  const handleDuplicate = async () => {
    if (!activity || busyAction) return;
    setBusyAction("duplicate");
    try {
      const slug = `${(activity.slug || activity.name || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error: insertErr } = await supabase.from("camps").insert({ slug, name: `(Copy) ${activity.name}`, description: activity.description, location: activity.location, capacity: activity.capacity, price_cents: activity.price_cents, hero_image_url: activity.hero_image_url, image_url: activity.image_url, image_urls: activity.image_urls, meta: activity.meta ?? {}, is_published: false, is_active: true, status: "active" }).select("id").single();
      if (insertErr) throw insertErr;
      if (data?.id) router.push(`/host/activities/${data.id}/edit`);
    } catch { setError("Could not duplicate listing."); }
    finally { setBusyAction(null); }
  };

  const confirmDelete = async () => {
    if (busyAction) return;
    setBusyAction("delete"); setDeleteError(null);
    try {
      const { error: delErr } = await supabase.from("camps").delete().eq("id", activityId);
      if (delErr) throw delErr;
      setDeleteOpen(false); router.push("/host/listings");
    } catch (e: any) { setDeleteError(e?.message ?? "Could not delete."); }
    finally { setBusyAction(null); }
  };

  const updateGuestStatus = async (bookingId: string, status: BookingStatus) => {
    setGuests(prev => prev.map(g => g.id === bookingId ? { ...g, status } : g));
    const { error } = await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", bookingId);
    if (error) setGuests(prev => prev.map(g => g.id === bookingId ? { ...g, status: "pending" } : g));
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading activity…</div>;
  if (error || !activity) return (
    <div className="p-6">
      <p className="text-sm text-destructive mb-4">{error || "Activity not found."}</p>
      <Button variant="outline" onClick={() => router.push("/host/listings")}>Back to listings</Button>
    </div>
  );

  /* ---- Derived values ---- */
  const meta = activity.meta ?? {};
  const dateRange = deriveDateRange(activity);
  const timeValue = deriveTimeLabel(activity);
  const cs = meta.classSchedule ?? {};
  // For classes: prefer pricePerClass or pricePerMeeting stored in meta over price_cents
  const classPriceLabel: string | null = (() => {
    if (meta.activityKind !== "class") return null;
    if (cs.pricePerClass) return `$${cs.pricePerClass} / class`;
    if (cs.pricePerMeeting) return `$${cs.pricePerMeeting} / session`;
    return null;
  })();
  const priceValue = classPriceLabel ?? formatMoney(activity.price_cents);
  const isPublished = meta.visibility === "public" || (meta.visibility == null && activity.is_published);
  const isVirtual = Boolean(meta.isVirtual);
  const capacityLabel = activity.capacity != null ? `${registrations} / ${activity.capacity}` : `${registrations}`;
  const ageLabel = deriveAgeLabel(meta);
  const heroUrl = getHeroImage(activity);
  const galleryUrls = getGalleryImages(activity, { includeHero: false, max: 8 });
  const allPhotos = heroUrl ? [heroUrl, ...galleryUrls] : galleryUrls;
  const campSessions: any[] = Array.isArray(meta.campSessions) ? meta.campSessions : [];
  const itinerary: any[] = Array.isArray(meta.activities) ? meta.activities.filter((a: any) => a.title) : [];
  const advanced = meta.advanced ?? {};
  const earlyDropoff = advanced.earlyDropoff ?? {};
  const extendedDay = advanced.extendedDay ?? {};
  const siblingDiscount = advanced.siblingDiscount ?? {};
  const hasAddOns = earlyDropoff.enabled || extendedDay.enabled || siblingDiscount.enabled;
  const cancellationPolicy = meta.cancellation_policy;
  const activityKind: string = meta.activityKind ?? "camp";
  const pendingCount = guests.filter(g => g.status === "pending").length;

  const tabs: Array<{ id: TabId; label: string; badge?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests", badge: pendingCount || undefined },
    { id: "attendance", label: "Attendance" },
    { id: "more", label: "More" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 lg:py-8">

      {/* Header */}
      <div className="mb-5">
        <Link href="/host/listings" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to listings
        </Link>
        <div className="flex items-start justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{activity.name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {isPublished ? "Published" : "Draft"}
              </span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                {activityKind}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleEdit}>Edit</Button>
            <ActionsMenu items={[
              { label: "View event page", onSelect: () => { if (activity.slug) router.push(`/camp/${activity.slug}`); }, disabled: !activity.slug },
              { label: busyAction === "duplicate" ? "Duplicating…" : "Duplicate", onSelect: handleDuplicate },
              { label: "Delete event", tone: "destructive", onSelect: () => { setDeleteError(null); setDeleteOpen(true); } },
            ]} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mb-5 border-b border-border flex gap-6">
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 pb-2.5 text-sm border-b-2 -mb-px transition-colors ${activeTab === tab.id ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
            {tab.badge ? (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{tab.badge}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* ===== OVERVIEW ===== */}
      {activeTab === "overview" && (
        <div className="space-y-4">

          {/* Hero image */}
          {heroUrl && (
            <div className="overflow-hidden rounded-2xl border border-border bg-muted aspect-video">
              <img src={heroUrl} alt={activity.name} className="h-full w-full object-cover" />
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
              <p className="text-[11px] text-muted-foreground">Price</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{priceValue ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">{classPriceLabel ? "per class" : "per child"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
              <p className="text-[11px] text-muted-foreground">Registrations</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{capacityLabel}</p>
              <p className="text-[11px] text-muted-foreground">{activity.capacity != null ? "filled" : "signed up"}</p>
            </div>
            {pendingCount > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-center">
                <p className="text-[11px] text-amber-700">Pending</p>
                <p className="mt-0.5 text-lg font-semibold text-amber-900">{pendingCount}</p>
                <p className="text-[11px] text-amber-700">need review</p>
              </div>
            ) : ageLabel ? (
              <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
                <p className="text-[11px] text-muted-foreground">Ages</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">{ageLabel}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
                <p className="text-[11px] text-muted-foreground">Status</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{isPublished ? "Live" : "Draft"}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>Description</SectionLabel>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{activity.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <SectionLabel>Details</SectionLabel>
            <div>
              {dateRange && (
                <Row icon={<Calendar className="h-3.5 w-3.5" />} label={dateRange.heading} value={dateRange.value} />
              )}
              {timeValue && (
                <Row icon={<Clock className="h-3.5 w-3.5" />} label="Time" value={timeValue} />
              )}
              {isVirtual ? (
                <Row icon={<Video className="h-3.5 w-3.5" />} label="Format" value={meta.meetingUrl ? "Virtual (link set)" : "Virtual"} />
              ) : activity.location ? (
                <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={activity.location} />
              ) : null}
              <Row icon={isPublished ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} label="Visibility" value={isPublished ? "Public" : "Draft"} />
              {meta.category && (
                <Row icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={meta.category} />
              )}
              {ageLabel && (
                <Row icon={<Baby className="h-3.5 w-3.5" />} label="Ages" value={ageLabel} />
              )}
              {activity.capacity != null && (
                <Row icon={<Users className="h-3.5 w-3.5" />} label="Capacity" value={`${activity.capacity} spots`} />
              )}
            </div>
          </div>

          {/* Camp Sessions */}
          {campSessions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>Sessions ({campSessions.length})</SectionLabel>
              <div className="space-y-2">
                {campSessions.map((session: any, i: number) => (
                  <div key={session.id ?? i} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{session.name || `Session ${i + 1}`}</p>
                      {(session.startDate || session.endDate) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.startDate}{session.endDate && session.endDate !== session.startDate ? ` – ${session.endDate}` : ""}
                        </p>
                      )}
                      {session.startTime && session.endTime && (
                        <p className="text-xs text-muted-foreground">{session.startTime} – {session.endTime}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {session.price_cents != null && <p className="text-sm font-semibold">${(session.price_cents / 100).toFixed(0)}</p>}
                      {session.spots != null && <p className="text-[11px] text-muted-foreground">{session.spots} spots</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities / Itinerary */}
          {itinerary.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>What you&apos;ll do</SectionLabel>
              <div className="space-y-3">
                {itinerary.map((act: any, i: number) => (
                  <div key={act.id ?? i} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{act.title}</p>
                      {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {hasAddOns && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>Add-ons</SectionLabel>
              <div>
                {earlyDropoff.enabled && (
                  <Row icon={<Sunrise className="h-3.5 w-3.5" />} label="Early drop-off"
                    value={[earlyDropoff.start && earlyDropoff.end ? `${earlyDropoff.start} – ${earlyDropoff.end}` : null, earlyDropoff.price ? `$${earlyDropoff.price}` : null].filter(Boolean).join(" · ") || "Enabled"} />
                )}
                {extendedDay.enabled && (
                  <Row icon={<Sunset className="h-3.5 w-3.5" />} label="Extended day"
                    value={[extendedDay.start && extendedDay.end ? `${extendedDay.start} – ${extendedDay.end}` : null, extendedDay.price ? `$${extendedDay.price}` : null].filter(Boolean).join(" · ") || "Enabled"} />
                )}
                {siblingDiscount.enabled && (
                  <Row icon={<RefreshCcw className="h-3.5 w-3.5" />} label="Sibling discount"
                    value={siblingDiscount.type === "percent" ? `${siblingDiscount.value ?? "—"}% off` : siblingDiscount.type === "amount" ? `$${siblingDiscount.value ?? "—"} off` : "Enabled"} />
                )}
              </div>
            </div>
          )}

          {/* Cancellation */}
          {cancellationPolicy && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>Cancellation policy</SectionLabel>
              <p className="text-sm text-foreground">{cancellationPolicy}</p>
            </div>
          )}

          {/* Photos */}
          {allPhotos.length > 1 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionLabel>Photos ({allPhotos.length})</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.slice(0, 8).map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listing URL */}
          {activity.slug && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <SectionLabel>Listing URL</SectionLabel>
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate text-xs text-muted-foreground">/camp/{activity.slug}</p>
                <button type="button"
                  onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/camp/${activity.slug}`)}
                  className="shrink-0 text-xs font-medium text-primary hover:text-primary/80">Copy</button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ===== GUESTS ===== */}
      {activeTab === "guests" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {["all", "pending", "confirmed", "declined"].map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1.5 text-xs border ${statusFilter === s ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-input hover:bg-muted"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}{s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {guestsLoading ? <div className="py-8 text-xs text-muted-foreground">Loading guests…</div>
              : filteredGuests.length === 0 ? <div className="py-8 text-xs text-muted-foreground">No guests yet.</div>
              : filteredGuests.map(g => {
                const name = g.parentName || g.parentEmail || g.contact_email || "Guest";
                const guestsLabel = (g.guests_count ?? 1) > 1 ? `${g.guests_count} guests` : "1 guest";
                const isPending = g.status === "pending";
                return (
                  <div key={g.id} className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
                    <Link href={`/host/activities/${activityId}/guests/${g.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center text-[13px] font-semibold text-violet-700 shrink-0">
                        {(name?.[0] ?? "G").toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{guestsLabel} · {whenLabel(g.created_at)}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={e => { e.preventDefault(); void updateGuestStatus(g.id, "declined"); }} className="text-xs text-destructive hover:text-destructive/80">Decline</button>
                          <button type="button" onClick={e => { e.preventDefault(); void updateGuestStatus(g.id, "confirmed"); }} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600">Approve</button>
                        </div>
                      ) : <span className={`text-xs capitalize font-medium ${g.status === "confirmed" ? "text-emerald-600" : g.status === "declined" ? "text-destructive" : "text-muted-foreground"}`}>{g.status}</span>}
                      <button
                        type="button"
                        onClick={() => router.push(`/messages?to=${g.user_id}`)}
                        className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                        aria-label="Message parent"
                        title="Message parent"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ===== ATTENDANCE ===== */}
      {activeTab === "attendance" && <AttendanceTab activity={activity} />}

      {/* ===== MORE ===== */}
      {activeTab === "more" && (
        <section className="space-y-8 max-w-xl">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Duplicate listing</h2>
            <p className="text-sm text-muted-foreground">Create a copy of this event with the same details.</p>
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={busyAction === "duplicate"}>
              {busyAction === "duplicate" ? "Duplicating…" : "Duplicate listing"}
            </Button>
          </div>
          {activity.slug && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Event page URL</h2>
              <div className="flex items-center gap-2 rounded-2xl bg-muted p-3">
                <p className="text-xs text-muted-foreground flex-1 truncate">/camp/{activity.slug}</p>
                <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/camp/${activity.slug}`)}>Copy</Button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-destructive">Cancel Event</h2>
            <p className="text-sm text-muted-foreground">Permanently delete this event. Cannot be undone.</p>
            <Button variant="destructive" size="sm" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>Cancel Event</Button>
          </div>
        </section>
      )}

      <DeleteModal open={deleteOpen} title={activity.name} deleting={busyAction === "delete"} error={deleteError} onClose={() => { if (busyAction !== "delete") setDeleteOpen(false); }} onConfirm={confirmDelete} />
    </div>
  );
}
