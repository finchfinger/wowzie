"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getHeroImage, getGalleryImages } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Send,
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

type ChildInfo = { id: string; name: string; age: number | null; emoji: string | null; };

type CampBookingRow = {
  id: string;
  camp_id: string;
  user_id: string;
  status: BookingStatus;
  created_at: string;
  guests_count: number;
  contact_email: string | null;
  /* hydrated client-side */
  parentName?: string | null;
  parentEmail?: string | null;
  children?: ChildInfo[];
};

function calcAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const d = new Date(birthdate + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age <= 25 ? age : null;
}

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

const DOW_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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
  // Weekly recurring class schedule (ongoing or with explicit start/end)
  const cs = meta.classSchedule ?? {};
  const weekly = cs.weekly ?? {};
  const activeDows = Object.entries(weekly)
    .filter(([, v]: [string, any]) => v?.available && Array.isArray(v.blocks) && v.blocks.length > 0)
    .map(([k]) => DOW_MAP[k])
    .filter((d) => d !== undefined) as number[];
  if (activeDows.length > 0) {
    const os = meta.ongoingSchedule ?? {};
    const rangeStart = os.startDate ? new Date(os.startDate + "T12:00:00") : new Date();
    const rangeEnd = os.endDate
      ? new Date(os.endDate + "T12:00:00")
      : new Date(rangeStart.getTime() + 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      if (activeDows.includes(cur.getDay())) days.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    if (days.size > 0) return Array.from(days).sort();
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground hover:bg-accent">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-popover shadow-lg z-20 overflow-hidden" role="menu">
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
      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-card bg-card p-5 shadow-lg">
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

const AVATAR_PALETTE = [
  "bg-blue-400 text-white",
  "bg-yellow-400 text-gray-900",
  "bg-green-500 text-white",
  "bg-pink-400 text-white",
  "bg-purple-400 text-white",
  "bg-orange-400 text-white",
  "bg-red-500 text-white",
  "bg-teal-400 text-white",
  "bg-indigo-400 text-white",
  "bg-emerald-400 text-white",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function formatDateOption(day: string, todayStr: string): string {
  if (day === todayStr) return "Today";
  const d = new Date(day + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* MiniCalendar                                                       */
/* ------------------------------------------------------------------ */

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCalendar({
  campDays,
  datesWithData,
  selectedDate,
  onSelect,
  todayStr,
}: {
  campDays: string[];
  datesWithData: Set<string>;
  selectedDate: string;
  onSelect: (day: string) => void;
  todayStr: string;
}) {
  const campDaySet = useMemo(() => new Set(campDays), [campDays]);

  const seed = selectedDate || todayStr;
  const seedDate = new Date(seed + "T12:00:00");
  const [viewYear, setViewYear] = useState(seedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(seedDate.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build cells: leading nulls + date strings + trailing nulls
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button type="button" onClick={nextMonth}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{l}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const day = new Date(dateStr + "T12:00:00").getDate();
          const isSession = campDaySet.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasData = datesWithData.has(dateStr);

          return (
            <div key={dateStr} className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isSession}
                onClick={() => onSelect(dateStr)}
                className={[
                  "relative h-8 w-8 rounded-full text-sm transition-colors flex items-center justify-center",
                  isSelected
                    ? "bg-foreground text-background font-semibold"
                    : isToday
                    ? "text-blue-600 font-bold hover:bg-blue-50"
                    : isSession
                    ? "text-foreground hover:bg-muted font-medium cursor-pointer"
                    : "text-muted-foreground/35 cursor-default font-normal",
                ].join(" ")}
              >
                {/* Today ring (when not selected) */}
                {isToday && !isSelected && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-blue-500" />
                )}
                {day}
              </button>
              {/* Dot for days with attendance data */}
              {hasData && (
                <span className={`h-1 w-1 rounded-full -mt-0.5 ${isSelected ? "bg-background/50" : "bg-emerald-500"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function entryKey(e: RosterEntry) { return `${e.bookingId}-${e.childId ?? "null"}`; }

function AttendanceTab({ activity }: { activity: Activity }) {
  const campId = activity.id;
  const campDays = useMemo(() => deriveCampDays(activity), [activity]);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Pick the most relevant date: today if it's a session day, else most recent past session, else next upcoming
  const defaultDay = useMemo(() => {
    if (campDays.includes(todayStr)) return todayStr;
    const past = campDays.filter(d => d < todayStr);
    if (past.length > 0) return past[past.length - 1];
    return campDays[0] ?? "";
  }, [campDays, todayStr]);

  const [selectedDate, setSelectedDate] = useState(defaultDay);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());

  const markBusy = (k: string) => setBusyKeys(prev => new Set([...prev, k]));
  const clearBusy = (k: string) => setBusyKeys(prev => { const s = new Set(prev); s.delete(k); return s; });

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Load all dates that have at least one check-in (for calendar dots)
  useEffect(() => {
    if (!campId) return;
    void supabase.from("attendance").select("date").eq("camp_id", campId)
      .not("checked_in_at", "is", null)
      .then(({ data }) => setDatesWithData(new Set((data ?? []).map((r: any) => r.date as string))));
  }, [campId]);

  // Load roster when date changes
  useEffect(() => {
    if (!campId || !selectedDate) return;
    let alive = true;
    setRosterLoading(true);
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/host/camp-bookings?campId=${campId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const bookings: any[] | null = res.ok ? await res.json() : null;
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

  // Realtime: keep attendance in sync across devices
  useEffect(() => {
    if (!campId || !selectedDate) return;
    const channel = supabase
      .channel(`attendance-${campId}-${selectedDate}`)
      .on("postgres_changes" as any, {
        event: "*", schema: "public", table: "attendance",
        filter: `camp_id=eq.${campId}`,
      }, (payload: any) => {
        const rec = (payload.new ?? payload.old) as AttendanceRecord;
        if (!rec || rec.date !== selectedDate) return;
        setRoster(prev => prev.map(r => {
          // Match by id (update/delete) or by booking+child key (insert)
          if (r.attendanceRecord?.id === rec.id || entryKey(r) === `${rec.booking_id}-${rec.child_id ?? "null"}`) {
            const next = payload.eventType === "DELETE" ? null
              : payload.new?.checked_in_at === null && payload.new?.checked_out_at === null ? { ...rec, checked_in_at: null, checked_out_at: null }
              : rec as AttendanceRecord;
            return { ...r, attendanceRecord: next };
          }
          return r;
        }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campId, selectedDate]);

  const handleCheckIn = async (entry: RosterEntry) => {
    const k = entryKey(entry);
    markBusy(k);
    const now = new Date().toISOString();
    if (entry.attendanceRecord?.id) {
      await supabase.from("attendance").update({ checked_in_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
      setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: now } } : r));
    } else {
      const { data: newRec } = await supabase.from("attendance").insert({
        camp_id: campId, booking_id: entry.bookingId, child_id: entry.childId,
        child_name: entry.childName, date: selectedDate, checked_in_at: now, marked_by: currentUserId,
      }).select("id, booking_id, child_id, child_name, date, checked_in_at, checked_out_at").single();
      if (newRec) {
        setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: newRec as AttendanceRecord } : r));
        setDatesWithData(prev => new Set([...prev, selectedDate]));
      }
    }
    clearBusy(k);
  };

  const handleCheckOut = async (entry: RosterEntry) => {
    if (!entry.attendanceRecord?.id) return;
    const k = entryKey(entry);
    markBusy(k);
    const now = new Date().toISOString();
    await supabase.from("attendance").update({ checked_out_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_out_at: now } } : r));
    clearBusy(k);
  };

  const handleUndo = async (entry: RosterEntry) => {
    if (!entry.attendanceRecord?.id) return;
    const k = entryKey(entry);
    markBusy(k);
    await supabase.from("attendance").update({ checked_in_at: null, checked_out_at: null, marked_by: null }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: null, checked_out_at: null } } : r));
    clearBusy(k);
  };

  // Sort: pending → checked-in → done; alphabetical within each group
  const filteredRoster = useMemo(() => {
    let filtered = roster;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = roster.filter(r =>
        r.childName.toLowerCase().includes(q) || r.parentName.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const rank = (r: RosterEntry) =>
        r.attendanceRecord?.checked_out_at ? 2 : r.attendanceRecord?.checked_in_at ? 1 : 0;
      const dr = rank(a) - rank(b);
      return dr !== 0 ? dr : a.childName.localeCompare(b.childName);
    });
  }, [roster, search]);

  if (campDays.length === 0) {
    return (
      <div className="bg-white rounded-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No dates configured for this activity yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Add session dates in the activity editor.</p>
      </div>
    );
  }

  const checkedInCount = roster.filter(r => r.attendanceRecord?.checked_in_at).length;
  const pct = roster.length > 0 ? Math.round((checkedInCount / roster.length) * 100) : 0;

  return (
    <div className="bg-white rounded-card">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Attendance</h2>
          {!rosterLoading && roster.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{checkedInCount} / {roster.length} checked in</span>
          )}
        </div>

        {/* Progress bar */}
        {!rosterLoading && roster.length > 0 && (
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Mini calendar */}
        <MiniCalendar
          campDays={campDays}
          datesWithData={datesWithData}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          todayStr={todayStr}
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Roster */}
      <div className="divide-y divide-border/40">
        {rosterLoading ? (
          /* Skeleton rows */
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
            </div>
          ))
        ) : filteredRoster.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? "No kids match your search." : "No confirmed registrations yet."}
          </div>
        ) : (
          filteredRoster.map((entry) => {
            const k = entryKey(entry);
            const busy = busyKeys.has(k);
            const att = entry.attendanceRecord;
            const isIn = Boolean(att?.checked_in_at);
            const isOut = Boolean(att?.checked_out_at);
            const colorClass = avatarColor(entry.childName);

            return (
              <div key={k} className={`flex items-center gap-4 px-6 py-4 transition-colors ${isOut ? "opacity-60" : isIn ? "bg-emerald-50/40" : ""}`}>
                {/* Avatar with status dot */}
                <div className="relative shrink-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass} ${isIn ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}>
                    {entry.emoji
                      ? <span className="text-lg">{entry.emoji}</span>
                      : entry.childName.charAt(0).toUpperCase()}
                  </div>
                  {isIn && !isOut && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                  {isOut && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gray-400 border-2 border-white" />
                  )}
                </div>

                {/* Name + parent + timestamps */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.childName}</p>
                  {isIn && (
                    <p className="text-xs text-muted-foreground truncate">
                      In {formatTime(new Date(att!.checked_in_at!))}{isOut && <> · Out {formatTime(new Date(att!.checked_out_at!))}</>}
                    </p>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0 flex items-center gap-2">
                  {!isIn && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleCheckIn(entry)}>
                      {busy ? "…" : "Check in"}
                    </Button>
                  )}
                  {isIn && !isOut && (
                    <Button size="sm" disabled={busy} onClick={() => void handleCheckOut(entry)}>
                      {busy ? "…" : "Check out"}
                    </Button>
                  )}
                  {isIn && isOut && (
                    <span className="text-xs font-medium text-muted-foreground px-2">Done ✓</span>
                  )}

                  <ActionsMenu items={[
                    {
                      label: "Undo check-in",
                      onSelect: () => void handleUndo(entry),
                      disabled: !isIn || busy,
                    },
                    {
                      label: "Undo check-out",
                      onSelect: () => {
                        if (!entry.attendanceRecord?.id) return;
                        void supabase.from("attendance").update({ checked_out_at: null }).eq("id", entry.attendanceRecord.id).then(() => {
                          setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_out_at: null } } : r));
                        });
                      },
                      disabled: !isOut || busy,
                    },
                  ]} />
                </div>
              </div>
            );
          })
        )}
      </div>
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
  const [guestSearch, setGuestSearch] = useState("");

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/host/camp-bookings?campId=${activity.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const bookingRows = res.ok ? await res.json() : [];
      if (!alive) return;

      const rows: CampBookingRow[] = (bookingRows ?? []) as CampBookingRow[];

      /* hydrate parent names + children */
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const [{ data: profileRows }, { data: childRows }] = await Promise.all([
          supabase.from("profiles").select("id, legal_name, preferred_first_name, email").in("id", userIds),
          supabase.from("children").select("id, legal_name, preferred_name, avatar_emoji, birthdate, parent_id").in("parent_id", userIds),
        ]);
        const profileMap = new Map(((profileRows ?? []) as any[]).map((p) => [p.id, p]));
        const childrenByParent = new Map<string, ChildInfo[]>();
        for (const c of (childRows ?? []) as any[]) {
          const info: ChildInfo = {
            id: c.id,
            name: c.preferred_name || c.legal_name || "Child",
            age: calcAge(c.birthdate),
            emoji: c.avatar_emoji ?? null,
          };
          const arr = childrenByParent.get(c.parent_id) ?? [];
          arr.push(info);
          childrenByParent.set(c.parent_id, arr);
        }
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
          row.children = childrenByParent.get(row.user_id) ?? [];
        }
      }

      setGuests(rows);
      setRegistrations(rows.filter(r => r.status === "confirmed" || r.status === "pending").length);
      setGuestsLoading(false);
    };
    void loadGuests();
    return () => { alive = false; };
  }, [activity?.id]);

  const filteredGuests = useMemo(() => {
    let list = statusFilter === "all" ? guests : guests.filter(g => g.status === statusFilter);
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      list = list.filter(g => {
        const names = [g.parentName, g.parentEmail, ...(g.children ?? []).map(c => c.name)].filter(Boolean).join(" ").toLowerCase();
        return names.includes(q);
      });
    }
    return list.slice().sort((a, b) => {
      const an = (a.children?.[0]?.name ?? a.parentName ?? "").toLowerCase();
      const bn = (b.children?.[0]?.name ?? b.parentName ?? "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [guests, statusFilter, guestSearch]);

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
  const waitlistedCount = guests.filter(g => g.status === "waitlisted").length;

  const tabs: Array<{ id: TabId; label: string; badge?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests", badge: pendingCount || undefined },
    { id: "attendance", label: "Attendance" },
    { id: "more", label: "More" },
  ];

  return (
    <div className="page-container py-6 lg:py-8">
      <div className="page-grid">
      <div className="span-8-center">

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
            <div className="relative overflow-hidden rounded-card bg-muted aspect-video">
              <Image src={heroUrl} alt={activity.name} fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" />
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Price</p>
              <p className="text-lg font-semibold text-foreground leading-none">{priceValue ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{classPriceLabel ? "per class" : "per child"}</p>
            </div>
            <div className="rounded-card bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Registrations</p>
              <p className="text-lg font-semibold text-foreground leading-none">{capacityLabel}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activity.capacity != null ? "filled" : "signed up"}</p>
            </div>
            {dateRange && (
              <div className="rounded-card bg-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{dateRange.heading}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{dateRange.value}</p>
              </div>
            )}
            {timeValue && (
              <div className="rounded-card bg-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">Time</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{timeValue}</p>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[11px] text-amber-700 mb-0.5">Pending</p>
                <p className="text-lg font-semibold text-amber-900 leading-none">{pendingCount}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">need review</p>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="rounded-card bg-card p-5">
              <SectionLabel>Description</SectionLabel>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{activity.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="rounded-card bg-card p-5">
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
            <div className="rounded-card bg-card p-5">
              <SectionLabel>Sessions ({campSessions.length})</SectionLabel>
              <div className="space-y-2">
                {campSessions.map((session: any, i: number) => (
                  <div key={session.id ?? i} className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 px-4 py-3">
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
            <div className="rounded-card bg-card p-5">
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
            <div className="rounded-card bg-card p-5">
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
            <div className="rounded-card bg-card p-5">
              <SectionLabel>Cancellation policy</SectionLabel>
              <p className="text-sm text-foreground">{cancellationPolicy}</p>
            </div>
          )}

          {/* Photos */}
          {allPhotos.length > 1 && (
            <div className="rounded-card bg-card p-5">
              <SectionLabel>Photos ({allPhotos.length})</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.slice(0, 8).map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <Image src={url} alt={`Photo ${i + 1}`} fill sizes="(max-width: 768px) 25vw, 160px" className="object-cover" />
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listing URL */}
          {activity.slug && (
            <div className="rounded-card bg-card p-4">
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
        <div className="rounded-card bg-card p-5">
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Guests</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Add guest
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Send update
              </Button>
            </div>
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search"
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <span>Alphabetical</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "pending", "confirmed", "declined", "waitlisted"].map(s => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${statusFilter === s ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-input hover:bg-muted"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                {s === "waitlisted" && waitlistedCount > 0 ? ` (${waitlistedCount})` : ""}
              </button>
            ))}
          </div>

          {/* Guest rows */}
          {guestsLoading ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Loading guests…</div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">No guests yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredGuests.flatMap(g => {
                const isPending = g.status === "pending";
                const when = whenLabel(g.created_at);
                // Show a row per child, or one row for the parent if no children
                const kids = g.children && g.children.length > 0 ? g.children : null;
                const rows = kids
                  ? kids.map(child => ({ key: `${g.id}-${child.id}`, name: child.name, sub: child.age != null ? `Age ${child.age}` : null, emoji: child.emoji }))
                  : [{ key: g.id, name: g.parentName || g.parentEmail || g.contact_email || "Guest", sub: null, emoji: null }];

                return rows.map(({ key, name, sub, emoji }, ri) => {
                  const initials = name.slice(0, 1).toUpperCase();
                  const colors = ["bg-blue-100 text-blue-700", "bg-yellow-100 text-yellow-700", "bg-pink-100 text-pink-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];
                  const colorClass = colors[(name.charCodeAt(0) ?? 0) % colors.length];
                  return (
                    <div key={key} className="flex items-center gap-3 py-3">
                      <Link href={`/host/activities/${activityId}/guests/${g.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${colorClass}`}>
                          {emoji ?? initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {isPending && ri === 0 ? (
                          <>
                            <button type="button" onClick={() => void updateGuestStatus(g.id, "declined")}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                              Decline ×
                            </button>
                            <button type="button" onClick={() => void updateGuestStatus(g.id, "confirmed")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                              Approve ✓
                            </button>
                          </>
                        ) : ri === 0 ? (
                          <span className="text-xs text-muted-foreground">{when}</span>
                        ) : null}
                        {ri === 0 && (
                          <button type="button" onClick={() => router.push(`/host/activities/${activityId}/guests/${g.id}`)}
                            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          )}
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
              <div className="flex items-center gap-2 rounded-card bg-muted p-3">
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
      </div>
    </div>
  );
}
