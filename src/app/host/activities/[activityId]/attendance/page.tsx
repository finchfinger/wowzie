"use client";

import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useActivity, type Activity } from "@/lib/activity-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

/* ------------------------------------------------------------------ */
/* Types                                                              */
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const DOW_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const AVATAR_PALETTE = [
  "bg-blue-400 text-white", "bg-yellow-400 text-gray-900", "bg-green-500 text-white",
  "bg-pink-400 text-white", "bg-purple-400 text-white", "bg-orange-400 text-white",
  "bg-red-500 text-white", "bg-teal-400 text-white", "bg-indigo-400 text-white", "bg-emerald-400 text-white",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function formatTime(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
}

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
  const cs = meta.classSchedule ?? {};
  const weekly = cs.weekly ?? {};
  const activeDows = Object.entries(weekly)
    .filter(([, v]: [string, any]) => v?.available && Array.isArray(v.blocks) && v.blocks.length > 0)
    .map(([k]) => DOW_MAP[k]).filter((d) => d !== undefined) as number[];
  if (activeDows.length > 0) {
    const os = meta.ongoingSchedule ?? {};
    const rangeStart = os.startDate ? new Date(os.startDate + "T12:00:00") : new Date();
    const rangeEnd = os.endDate ? new Date(os.endDate + "T12:00:00") : new Date(rangeStart.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      if (activeDows.includes(cur.getDay())) days.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    if (days.size > 0) return Array.from(days).sort();
  }
  return [];
}

function entryKey(e: RosterEntry) { return `${e.bookingId}-${e.childId ?? "null"}`; }

/* ------------------------------------------------------------------ */
/* MiniCalendar                                                        */
/* ------------------------------------------------------------------ */

function MiniCalendar({ campDays, datesWithData, selectedDate, onSelect, todayStr }: {
  campDays: string[]; datesWithData: Set<string>; selectedDate: string;
  onSelect: (day: string) => void; todayStr: string;
}) {
  const campDaySet = useMemo(() => new Set(campDays), [campDays]);
  const seed = selectedDate || todayStr;
  const seedDate = new Date(seed + "T12:00:00");
  const [viewYear, setViewYear] = useState(seedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(seedDate.getMonth());

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

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
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
          <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>chevron_left</span>
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
          <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>chevron_right</span>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((l, i) => <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{l}</div>)}
      </div>
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
              <button type="button" disabled={!isSession} onClick={() => onSelect(dateStr)}
                className={["relative h-8 w-8 rounded-full text-sm transition-colors flex items-center justify-center",
                  isSelected ? "bg-foreground text-background font-semibold" :
                  isToday ? "text-blue-600 font-bold hover:bg-blue-50" :
                  isSession ? "text-foreground hover:bg-muted font-medium cursor-pointer" :
                  "text-muted-foreground/35 cursor-default font-normal"].join(" ")}>
                {isToday && !isSelected && <span className="absolute inset-0 rounded-full ring-2 ring-blue-500" />}
                {day}
              </button>
              {hasData && <span className={`h-1 w-1 rounded-full -mt-0.5 ${isSelected ? "bg-background/50" : "bg-emerald-500"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ActionsMenu (local)                                                */
/* ------------------------------------------------------------------ */

function ActionsMenu({ items }: { items: { label: string; onSelect: () => void; disabled?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors text-xs">
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-popover shadow-lg z-20 overflow-hidden">
          {items.map((item, i) => (
            <button key={i} type="button" disabled={item.disabled}
              className={`block w-full px-3 py-2 text-left text-xs ${item.disabled ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover:bg-accent"}`}
              onClick={() => { if (!item.disabled) { item.onSelect(); setOpen(false); } }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance page                                                     */
/* ------------------------------------------------------------------ */

export default function AttendancePage() {
  const { activity } = useActivity();

  if (!activity) return null;
  return <AttendanceTab activity={activity} />;
}

function AttendanceTab({ activity }: { activity: Activity }) {
  const campId = activity.id;
  const campDays = useMemo(() => deriveCampDays(activity), [activity]);
  const todayStr = new Date().toISOString().slice(0, 10);
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

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null)); }, []);

  useEffect(() => {
    if (!campId) return;
    void supabase.from("attendance").select("date").eq("camp_id", campId).not("checked_in_at", "is", null)
      .then(({ data }) => setDatesWithData(new Set((data ?? []).map((r: any) => r.date as string))));
  }, [campId]);

  useEffect(() => {
    if (!campId || !selectedDate) return;
    let alive = true;
    setRosterLoading(true);
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/host/camp-bookings?campId=${campId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
        const parentName = p?.preferred_first_name ? `${p.preferred_first_name} ${p.legal_name ?? ""}`.trim() : p?.legal_name ?? booking.contact_email ?? "Parent";
        const kids = ((children ?? []) as any[]).filter((c: any) => c.parent_id === booking.user_id);
        for (const child of kids) {
          entries.push({ bookingId: booking.id, parentName, childId: child.id, childName: child.preferred_name || child.legal_name || "Child", emoji: child.avatar_emoji ?? null, attendanceRecord: attMap.get(`${booking.id}-${child.id}`) ?? null });
        }
        const anonymous = (booking.guests_count ?? 0) - kids.length;
        for (let i = 0; i < anonymous; i++) {
          entries.push({ bookingId: booking.id, parentName, childId: null, childName: `${parentName}'s child`, emoji: null, attendanceRecord: attMap.get(`${booking.id}-null`) ?? null });
        }
      }
      setRoster(entries);
      setRosterLoading(false);
    })();
    return () => { alive = false; };
  }, [campId, selectedDate]);

  // Realtime sync
  useEffect(() => {
    if (!campId || !selectedDate) return;
    const channel = supabase.channel(`attendance-${campId}-${selectedDate}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "attendance", filter: `camp_id=eq.${campId}` }, (payload: any) => {
        const rec = (payload.new ?? payload.old) as AttendanceRecord;
        if (!rec || rec.date !== selectedDate) return;
        setRoster(prev => prev.map(r => {
          if (r.attendanceRecord?.id === rec.id || entryKey(r) === `${rec.booking_id}-${rec.child_id ?? "null"}`) {
            const next = payload.eventType === "DELETE" ? null : payload.new?.checked_in_at === null && payload.new?.checked_out_at === null ? { ...rec, checked_in_at: null, checked_out_at: null } : rec as AttendanceRecord;
            return { ...r, attendanceRecord: next };
          }
          return r;
        }));
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campId, selectedDate]);

  const handleCheckIn = async (entry: RosterEntry) => {
    const k = entryKey(entry); markBusy(k);
    const now = new Date().toISOString();
    if (entry.attendanceRecord?.id) {
      await supabase.from("attendance").update({ checked_in_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
      setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: now } } : r));
    } else {
      const { data: newRec } = await supabase.from("attendance").insert({ camp_id: campId, booking_id: entry.bookingId, child_id: entry.childId, child_name: entry.childName, date: selectedDate, checked_in_at: now, marked_by: currentUserId }).select("id, booking_id, child_id, child_name, date, checked_in_at, checked_out_at").single();
      if (newRec) { setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: newRec as AttendanceRecord } : r)); setDatesWithData(prev => new Set([...prev, selectedDate])); }
    }
    clearBusy(k);
  };

  const handleCheckOut = async (entry: RosterEntry) => {
    if (!entry.attendanceRecord?.id) return;
    const k = entryKey(entry); markBusy(k);
    const now = new Date().toISOString();
    await supabase.from("attendance").update({ checked_out_at: now, marked_by: currentUserId }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_out_at: now } } : r));
    clearBusy(k);
  };

  const handleUndo = async (entry: RosterEntry) => {
    if (!entry.attendanceRecord?.id) return;
    const k = entryKey(entry); markBusy(k);
    await supabase.from("attendance").update({ checked_in_at: null, checked_out_at: null, marked_by: null }).eq("id", entry.attendanceRecord.id);
    setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_in_at: null, checked_out_at: null } } : r));
    clearBusy(k);
  };

  const filteredRoster = useMemo(() => {
    let filtered = roster;
    if (search.trim()) { const q = search.toLowerCase(); filtered = roster.filter(r => r.childName.toLowerCase().includes(q) || r.parentName.toLowerCase().includes(q)); }
    return [...filtered].sort((a, b) => {
      const rank = (r: RosterEntry) => r.attendanceRecord?.checked_out_at ? 2 : r.attendanceRecord?.checked_in_at ? 1 : 0;
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

  if (!rosterLoading && roster.length === 0) {
    return (
      <EmptyState
        icon="child_hat"
        iconBg="bg-yellow-300"
        iconColor="text-yellow-900"
        title="No guests yet"
        description="Once families book, you'll see them here. Check them in and track attendance all in one place."
      />
    );
  }

  const checkedInCount = roster.filter(r => r.attendanceRecord?.checked_in_at).length;
  const pct = roster.length > 0 ? Math.round((checkedInCount / roster.length) * 100) : 0;

  return (
    <div className="bg-white rounded-card">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Attendance</h2>
          {!rosterLoading && roster.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{checkedInCount} / {roster.length} checked in</span>
          )}
        </div>
        {!rosterLoading && roster.length > 0 && (
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
        <MiniCalendar campDays={campDays} datesWithData={datesWithData} selectedDate={selectedDate} onSelect={setSelectedDate} todayStr={todayStr} />
        <div className="relative">
          <span className="material-symbols-rounded select-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ fontSize: 16 }} aria-hidden>search</span>
          <Input className="pl-9" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="divide-y divide-border/40">
        {rosterLoading ? (
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
          filteredRoster.map(entry => {
            const k = entryKey(entry);
            const busy = busyKeys.has(k);
            const att = entry.attendanceRecord;
            const isIn = Boolean(att?.checked_in_at);
            const isOut = Boolean(att?.checked_out_at);
            const colorClass = avatarColor(entry.childName);
            return (
              <div key={k} className={`flex items-center gap-4 px-6 py-4 transition-colors ${isOut ? "opacity-60" : isIn ? "bg-emerald-50/40" : ""}`}>
                <div className="relative shrink-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass} ${isIn ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}>
                    {entry.emoji ? <span className="text-lg">{entry.emoji}</span> : entry.childName.charAt(0).toUpperCase()}
                  </div>
                  {isIn && !isOut && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />}
                  {isOut && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gray-400 border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.childName}</p>
                  {isIn && (
                    <p className="text-xs text-muted-foreground truncate">
                      In {formatTime(new Date(att!.checked_in_at!))}{isOut && <> · Out {formatTime(new Date(att!.checked_out_at!))}</>}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {!isIn && <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleCheckIn(entry)}>{busy ? "…" : "Check in"}</Button>}
                  {isIn && !isOut && <Button size="sm" disabled={busy} onClick={() => void handleCheckOut(entry)}>{busy ? "…" : "Check out"}</Button>}
                  {isIn && isOut && <span className="text-xs font-medium text-muted-foreground px-2">Done ✓</span>}
                  <ActionsMenu items={[
                    { label: "Undo check-in", onSelect: () => void handleUndo(entry), disabled: !isIn || busy },
                    { label: "Undo check-out", onSelect: () => { if (!entry.attendanceRecord?.id) return; void supabase.from("attendance").update({ checked_out_at: null }).eq("id", entry.attendanceRecord.id).then(() => { setRoster(prev => prev.map(r => entryKey(r) === k ? { ...r, attendanceRecord: { ...r.attendanceRecord!, checked_out_at: null } } : r)); }); }, disabled: !isOut || busy },
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
