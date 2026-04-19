"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPriceUnit } from "@/lib/pricing";
import Link from "next/link";
import type { Camp } from "@/components/CampCard";
import { AddressInput } from "@/components/ui/AddressInput";
import { FilterBadge } from "@/components/ui/FilterBadge";
import { applyDistanceFilter } from "@/lib/geo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Date helpers ── */

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromISODate = (iso: string) => {
  const t = Date.parse(`${iso}T00:00:00`);
  return Number.isFinite(t) ? new Date(t) : undefined;
};

const formatDisplayDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
};

const formatDatesLabel = (start: string, end: string) => {
  if (!start && !end) return "Dates";
  if (start && !end) return formatDisplayDate(start);
  if (!start && end) return formatDisplayDate(end);
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
};

/* ── Constants ── */

const SELECT_COLUMNS = `
  id,
  program_id,
  slug,
  name,
  description,
  location,
  lat,
  lng,
  session_start,
  session_end,
  image_url,
  hero_image_url,
  image_urls,
  price_cents,
  status,
  meta,
  category,
  categories,
  featured,
  listing_type,
  format,
  time_of_day,
  series_weeks,
  schedule_days,
  start_time,
  end_time,
  created_at,
  is_promoted
`;

/** Floats up to 3 promoted listings to the top, preserving organic order otherwise */
function boostPromoted<T extends { is_promoted?: boolean | null }>(rows: T[]): T[] {
  const promoted = rows.filter((r) => r.is_promoted === true).slice(0, 3);
  const promotedSet = new Set(promoted);
  const organic = rows.filter((r) => !promotedSet.has(r));
  return [...promoted, ...organic];
}

const CATEGORIES = [
  { value: "art",      label: "Art" },
  { value: "sports",   label: "Sports" },
  { value: "stem",     label: "STEM" },
  { value: "music",    label: "Music" },
  { value: "outdoor",  label: "Outdoor" },
  { value: "academic", label: "Academic" },
  { value: "theater",  label: "Theater" },
  { value: "dance",    label: "Dance" },
  { value: "cooking",  label: "Cooking" },
];

const AGE_OPTIONS = [
  { value: "",        label: "All ages" },
  { value: "3_5",     label: "Ages 3–5" },
  { value: "6_8",     label: "Ages 6–8" },
  { value: "9_12",    label: "Ages 9–12" },
  { value: "13_plus", label: "Ages 13+" },
];

const DAYS_OF_WEEK = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const TIME_OF_DAY = [
  { value: "morning",   label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening",   label: "Evening" },
];

const AGE_BUCKET_MAP: Record<string, string> = {
  "3_5": "3-5", "6_8": "6-8", "9_12": "9-12", "13_plus": "13+",
};
const AGE_RANGE_MAP: Record<string, [number, number]> = {
  "3_5": [3, 5], "6_8": [6, 8], "9_12": [9, 12], "13_plus": [13, 99],
};

/* ── Types ── */

type CampRow = Camp & {
  program_id?: string | null;
  created_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  image_urls?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  session_start?: string | null;
  session_end?: string | null;
  schedule_days?: string[] | null;
  time_of_day?: string | null;
  is_promoted?: boolean | null;
};

/* ── Helpers ── */

const toInt = (v: string | null) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const splitCsv = (v: string | null) => {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

const normalizeDay = (d: string) => d.toLowerCase().slice(0, 3);

function formatDateRange(start: string, end?: string | null): string {
  const pad = (s: string) => (s.includes("T") ? s : s + "T00:00:00");
  const s = new Date(pad(start));
  const months = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  if (!end) return `${weekdays[s.getDay()]}, ${months[s.getMonth()]} ${s.getDate()}`;
  const e = new Date(pad(end));
  if (start.split("T")[0] === end.split("T")[0]) {
    return `${weekdays[s.getDay()]}, ${months[s.getMonth()]} ${s.getDate()}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${weekdays[s.getDay()]}–${weekdays[e.getDay()]}, ${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}`;
}

function formatTimeRange(start: string, end?: string | null): string {
  if (!start.includes("T")) return "";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!end || !end.includes("T")) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function campMatchesAge(c: CampRow, ageVal: string): boolean {
  if (!ageVal || ageVal === "any") return true;
  const buckets = (c.meta?.age_buckets as string[] | undefined) ?? [];
  const minAge = c.meta?.min_age as number | undefined;
  const maxAge = c.meta?.max_age as number | undefined;
  if (!buckets.length && minAge == null && maxAge == null) return true;
  if (buckets.includes("all")) return true;
  const targetBucket = AGE_BUCKET_MAP[ageVal];
  if (targetBucket && buckets.includes(targetBucket)) return true;
  if (minAge != null || maxAge != null) {
    const [lo, hi] = AGE_RANGE_MAP[ageVal] ?? [0, 99];
    return (minAge ?? 0) <= hi && (maxAge ?? 99) >= lo;
  }
  return false;
}

function dedupeByProgram(rows: CampRow[]) {
  const seen = new Set<string>();
  const out: CampRow[] = [];
  for (const r of rows) {
    const pid = r.program_id?.trim();
    if (!pid) { out.push(r); continue; }
    if (seen.has(pid)) continue;
    seen.add(pid);
    out.push(r);
  }
  return out;
}

function formatDateLabel(start: string, end: string) {
  if (!start && !end) return null;
  const fmt = (d: string) => {
    const [, m, day] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end)}`;
}

/* ── Result row ── */

function SearchResultRow({ camp, favIds, onToggleFav }: {
  camp: CampRow;
  favIds: Set<string>;
  onToggleFav: (id: string) => void;
}) {
  const isFav = favIds.has(camp.id);
  const image = camp.hero_image_url || camp.image_urls?.[0] || camp.image_url;
  const price = typeof camp.price_cents === "number" && camp.price_cents > 0
    ? `$${Math.round(camp.price_cents / 100)}` : null;
  const priceUnit = getPriceUnit(camp);
  const dateStr = camp.start_time ? formatDateRange(camp.start_time, camp.end_time) : null;
  const timeStr = camp.start_time ? formatTimeRange(camp.start_time, camp.end_time) : null;
  const locationStr = (camp.meta?.locationName as string | undefined)
    || (camp as unknown as { location?: string }).location || null;

  return (
    <div className="flex items-center gap-2 sm:gap-4 py-4 border-b border-border last:border-0 min-w-0 overflow-hidden">
      <Link href={`/camp/${camp.slug}`} className="shrink-0">
        <div className="relative h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] rounded-xl overflow-hidden bg-muted">
          {image
            ? <Image src={image} alt={camp.name} fill sizes="72px" className="object-cover" />
            : <div className="h-full w-full bg-muted" />}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Link
            href={`/camp/${camp.slug}`}
            className="font-semibold text-foreground hover:underline truncate"
          >
            {camp.name}
          </Link>
          <button
            type="button"
            onClick={() => onToggleFav(camp.id)}
            className="shrink-0 transition-transform hover:scale-110"
            aria-label={isFav ? "Remove from favorites" : "Save"}
          >
            <span className={`material-symbols-rounded select-none ${isFav ? "text-red-500" : "text-muted-foreground/40"}`} style={{ fontSize: 16, fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          </button>
        </div>
        {dateStr && <p className="text-sm text-muted-foreground truncate">{dateStr}</p>}
        {timeStr && <p className="text-sm text-muted-foreground truncate">{timeStr}</p>}
        {locationStr && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{locationStr}</p>}
      </div>

      {price && (
        <div className="text-right shrink-0 flex flex-col items-end min-w-0">
          <span className="font-semibold text-foreground text-sm">{price}</span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">{priceUnit}</span>
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 sm:gap-4 py-4 border-b border-border animate-pulse">
      <div className="h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-36 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="h-4 w-20 rounded bg-muted shrink-0" />
    </div>
  );
}

/* ── Pill button ── */

function FilterPill({
  children,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-sm transition-colors whitespace-nowrap outline-none",
        active ? "bg-foreground text-background" : "text-foreground",
        className,
      )}
      style={active ? undefined : { background: "#fff" }}
    >
      {children}
    </button>
  );
}

/* ── Main export ── */

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main>
        <div className="page-container py-10">
          <div className="page-grid">
            <div className="span-8-center">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          </div>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}

/* ── SearchContent ── */

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // ── URL-derived filter values ──
  const initialQ        = searchParams.get("q")?.trim() || "";
  const initialCategory = searchParams.get("category")?.trim() || "";
  const initialAge      = searchParams.get("age")?.trim() || "";
  const groupMode       = searchParams.get("group")?.trim() || "";
  const tags            = splitCsv(searchParams.get("tags"));
  const listingType     = searchParams.get("type")?.trim() || "";
  const seriesWeeks     = toInt(searchParams.get("weeks"));
  const featured        = searchParams.get("featured") === "1" || searchParams.get("featured") === "true";
  const programId       = searchParams.get("program")?.trim() || "";
  const initialMax      = toInt(searchParams.get("max"));
  const initialDays     = splitCsv(searchParams.get("days"));
  const initialTod      = searchParams.get("tod")?.trim() || "";
  // Location + dates
  const urlLocLat  = parseFloat(searchParams.get("loc_lat") || "") || null;
  const urlLocLng  = parseFloat(searchParams.get("loc_lng") || "") || null;
  const urlLocText = searchParams.get("location")?.trim() || "";
  const urlStart   = searchParams.get("start")?.trim() || "";
  const urlEnd     = searchParams.get("end")?.trim() || "";

  // ── Local controlled state ──
  const [localQ, setLocalQ]               = useState(initialQ);
  const [localAge, setLocalAge]           = useState(initialAge);
  const [localStart, setLocalStart]       = useState(urlStart);
  const [localEnd, setLocalEnd]           = useState(urlEnd);
  const [datesOpen, setDatesOpen]         = useState(false);
  const todayRef = useRef<Date>(new Date());
  const [isMobile, setIsMobile]           = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const [localLocation, setLocalLocation] = useState(urlLocText);
  const [locCoords, setLocCoords]         = useState<{ lat: number; lng: number } | null>(
    urlLocLat && urlLocLng ? { lat: urlLocLat, lng: urlLocLng } : null,
  );
  const [usingBrowserGeo, setUsingBrowserGeo] = useState(false);
  const [appliedRadius, setAppliedRadius]     = useState<number | null>(null);

  // Advanced filters (live in modal, pushed to URL on Apply)
  const [filtersOpen, setFiltersOpen]     = useState(false);
  const [modalCategory, setModalCategory] = useState(initialCategory);
  const [modalMaxPrice, setModalMaxPrice] = useState<number | null>(initialMax);
  const [modalDays, setModalDays]         = useState<string[]>(initialDays);
  const [modalTod, setModalTod]           = useState(initialTod);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when URL changes (back/forward)
  useEffect(() => { setLocalQ(initialQ); },          [initialQ]);
  useEffect(() => { setLocalAge(initialAge); },       [initialAge]);
  useEffect(() => { setLocalStart(urlStart); },       [urlStart]);
  useEffect(() => { setLocalEnd(urlEnd); },           [urlEnd]);
  useEffect(() => { setLocalLocation(urlLocText); },  [urlLocText]);
  useEffect(() => { setModalCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { setModalMaxPrice(initialMax); },   [initialMax]);
  useEffect(() => { setModalDays(initialDays); },      // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.get("days")]);
  useEffect(() => { setModalTod(initialTod); },        [initialTod]);

  // Browser geolocation: use on mount if no location in URL
  useEffect(() => {
    if (urlLocLat && urlLocLng) return; // already have coords from URL
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingBrowserGeo(true);
      },
      () => { /* permission denied — no distance filter */ },
      { timeout: 5000 },
    );
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── URL helpers ──
  const pushParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleQChange = (val: string) => {
    setLocalQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: val }), 400);
  };

  const handleAgeChange = (val: string) => {
    setLocalAge(val);
    pushParams({ age: val });
  };

  const handleLocationSelect = (sel: { formattedAddress?: string; location?: { lat: number; lng: number } }) => {
    const addr = sel.formattedAddress?.replace(/, USA$/, "").replace(/, United States$/, "") || "";
    setLocalLocation(addr);
    setUsingBrowserGeo(false);
    if (sel.location) {
      setLocCoords(sel.location);
      pushParams({
        location: addr,
        loc_lat: String(sel.location.lat),
        loc_lng: String(sel.location.lng),
      });
    } else {
      setLocCoords(null);
      pushParams({ location: addr, loc_lat: "", loc_lng: "" });
    }
  };

  const clearLocation = () => {
    setLocalLocation("");
    setLocCoords(null);
    setUsingBrowserGeo(false);
    pushParams({ location: "", loc_lat: "", loc_lng: "" });
  };

  const handleDateChange = (start: string, end: string) => {
    setLocalStart(start);
    setLocalEnd(end);
    pushParams({ start, end });
  };

  const selectedRange: DateRange | undefined = useMemo(() => {
    const from = localStart ? fromISODate(localStart) : undefined;
    const to   = localEnd   ? fromISODate(localEnd)   : undefined;
    return from || to ? { from, to } : undefined;
  }, [localStart, localEnd]);

  const applyModalFilters = () => {
    pushParams({
      category: modalCategory,
      max: modalMaxPrice != null ? String(modalMaxPrice) : "",
      days: modalDays.join(","),
      tod: modalTod,
    });
    setFiltersOpen(false);
  };

  const clearModalFilters = () => {
    setModalCategory("");
    setModalMaxPrice(null);
    setModalDays([]);
    setModalTod("");
  };

  // ── DB fetch ──
  const [results, setResults]   = useState<CampRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Advanced modal filter values that go to DB
  const dbDays    = initialDays;
  const dbTod     = initialTod;
  const dbMaxCents = initialMax != null ? initialMax * 100 : null;

  const depKey = useMemo(
    () => JSON.stringify({ initialQ, initialCategory, tags, listingType, seriesWeeks, dbDays, dbTod, featured, dbMaxCents, programId, groupMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialQ, initialCategory, JSON.stringify(tags), listingType, seriesWeeks, JSON.stringify(dbDays), dbTod, featured, dbMaxCents, programId, groupMode],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("camps").select(SELECT_COLUMNS)
        .eq("is_published", true).eq("is_active", true)
        .order("created_at", { ascending: false });

      if (initialQ)         { const like = `%${initialQ}%`; query = query.or(`name.ilike.${like},description.ilike.${like}`); }
      if (programId)        query = query.eq("program_id", programId);
      if (initialCategory)  query = query.eq("category", initialCategory);
      if (featured)         query = query.eq("featured", true);
      if (listingType)      query = query.eq("listing_type", listingType);
      if (seriesWeeks != null) query = query.eq("series_weeks", seriesWeeks);
      if (dbDays.length > 0)   query = query.contains("schedule_days", dbDays.map(normalizeDay));
      if (dbTod)            query = query.eq("time_of_day", dbTod);
      if (tags.length > 0)  query = query.overlaps("categories", tags);
      if (dbMaxCents != null) query = query.lte("price_cents", dbMaxCents);

      const { data, error: dbError } = await query;
      if (dbError) { setError("Sorry, we couldn't load results."); setResults([]); }
      else {
        const rows = (data || []) as CampRow[];
        const sorted = boostPromoted(groupMode === "program" ? dedupeByProgram(rows) : rows);
        setResults(sorted);
      }
      setLoading(false);
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  // ── Favorites ──
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("camp_favorites").select("camp_id").eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFavIds(new Set(data.map((r: { camp_id: string }) => r.camp_id)));
      });
  }, [user?.id]);

  const toggleFav = async (campId: string) => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent("wowzi:open-auth")); return; }
    const next = new Set(favIds);
    if (next.has(campId)) {
      next.delete(campId);
      await supabase.from("camp_favorites").delete().eq("user_id", user.id).eq("camp_id", campId);
    } else {
      next.add(campId);
      await supabase.from("camp_favorites").insert({ user_id: user.id, camp_id: campId });
    }
    setFavIds(next);
  };

  // ── Client-side filters ──
  const displayedResults = useMemo(() => {
    let filtered = results.filter((c) => campMatchesAge(c, localAge));

    // Distance filter (auto-expanding radius)
    if (locCoords) {
      const { results: nearby, radiusMiles } = applyDistanceFilter(filtered, locCoords.lat, locCoords.lng);
      filtered = nearby;
      setAppliedRadius(radiusMiles);
    } else {
      setAppliedRadius(null);
    }

    // Date overlap filter
    if (localStart || localEnd) {
      filtered = filtered.filter((c) => {
        if (!c.session_start && !c.session_end) return true; // ongoing / no dates → always show
        if (localStart && c.session_end && c.session_end < localStart) return false;
        if (localEnd && c.session_start && c.session_start > localEnd) return false;
        return true;
      });
    }

    return filtered;
  }, [results, localAge, locCoords, localStart, localEnd]);

  // ── Active filter state ──
  const advancedFilterCount =
    (initialCategory ? 1 : 0) +
    (initialMax != null ? 1 : 0) +
    (initialDays.length > 0 ? 1 : 0) +
    (initialTod ? 1 : 0);

  const hasDateFilter = !!(localStart || localEnd);
  const hasLocationFilter = !!(locCoords);

  const hasAnyFilter = !!(localQ || hasLocationFilter || hasDateFilter || localAge || advancedFilterCount > 0);

  const clearAll = () => {
    setLocalQ(""); setLocalAge(""); setLocalStart(""); setLocalEnd("");
    setLocalLocation(""); setLocCoords(null); setUsingBrowserGeo(false);
    setModalCategory(""); setModalMaxPrice(null); setModalDays([]); setModalTod("");
    router.replace("/search", { scroll: false });
  };

  // ── Chip labels for active filters ──
  const dateLabel = formatDateLabel(localStart, localEnd);
  const locationLabel = usingBrowserGeo
    ? "Near me"
    : localLocation
      ? localLocation.split(",")[0]
      : null;

  return (
    <main>
      <div className="page-container py-8">
        <div className="page-grid">
          <div className="span-8-center space-y-5">

            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
              Let&apos;s find something awesome
            </h1>

            {/* ── Filter bar ── */}
            <div className="space-y-3">
              {/* Row 1: Search input */}
              <div className="relative flex items-center rounded-full" style={{ background: "#fff" }}>
                <span className="material-symbols-rounded select-none absolute left-4 text-foreground pointer-events-none" style={{ fontSize: 20, lineHeight: 1 }}>search</span>
                <input
                  value={localQ}
                  onChange={(e) => handleQChange(e.target.value)}
                  placeholder="What type of activity are you looking for?"
                  className="h-12 w-full bg-transparent pl-12 pr-9 text-sm outline-none"
                  style={{ color: localQ ? "#1C1B1F" : undefined }}
                  autoComplete="off"
                />
                {localQ && (
                  <button type="button"
                    onClick={() => { setLocalQ(""); pushParams({ q: "" }); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>close</span>
                  </button>
                )}
              </div>

              {/* Row 2: Pill filters */}
              <div className="flex flex-wrap gap-2">
                {/* Location */}
                <div className="relative flex-1 min-w-[160px] max-w-[260px]">
                  <AddressInput
                    value={usingBrowserGeo ? "" : localLocation}
                    onChange={(val) => {
                      setLocalLocation(val);
                      if (!val) { setLocCoords(null); setUsingBrowserGeo(false); pushParams({ location: "", loc_lat: "", loc_lng: "" }); }
                    }}
                    onSelect={handleLocationSelect}
                    placeholder={usingBrowserGeo ? "Near me" : "Location"}
                    className="h-12 rounded-full pr-8 text-sm"
                    style={{ background: "#fff", color: localLocation ? "#1C1B1F" : undefined, border: "none" }}
                  />
                  {(localLocation || usingBrowserGeo) && (
                    <button type="button" onClick={clearLocation}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: 14 }}>close</span>
                    </button>
                  )}
                </div>

                {/* Dates */}
                <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "h-12 rounded-full px-4 text-sm transition-colors whitespace-nowrap outline-none",
                        localStart || localEnd ? "bg-foreground text-background" : "",
                      )}
                      style={localStart || localEnd ? undefined : { background: "#fff", color: "#49454F" }}
                    >
                      {formatDatesLabel(localStart, localEnd)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(560px,calc(100vw-2rem))] p-3"
                  >
                    <Calendar
                      mode="range"
                      numberOfMonths={isMobile ? 1 : 2}
                      selected={selectedRange}
                      defaultMonth={selectedRange?.from ?? todayRef.current}
                      fromDate={todayRef.current}
                      onSelect={(range) => {
                        const from = range?.from ? toISODate(range.from) : "";
                        const to   = range?.to   ? toISODate(range.to)   : "";
                        setLocalStart(from);
                        setLocalEnd(to);
                      }}
                      captionLayout="dropdown"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { handleDateChange("", ""); }}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => { handleDateChange(localStart, localEnd); setDatesOpen(false); }}
                      >
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Ages */}
                <select
                  value={localAge}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  className={cn(
                    "h-12 appearance-none rounded-full pl-4 pr-8 text-sm outline-none cursor-pointer transition-colors",
                    localAge ? "bg-foreground text-background" : "",
                  )}
                  style={localAge ? undefined : { background: "#fff", color: "#49454F", border: "none" }}
                >
                  {AGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Filters button */}
                <FilterPill
                  active={advancedFilterCount > 0}
                  onClick={() => setFiltersOpen(true)}
                >
                  <span className="material-symbols-rounded select-none" style={{ fontSize: 15 }} aria-hidden>tune</span>
                  Filters
                  <FilterBadge count={advancedFilterCount} />
                </FilterPill>
              </div>

              {/* Active filter chips */}
              {hasAnyFilter && (
                <div className="flex items-center gap-2 flex-wrap">
                  {localQ && <Chip label={`"${localQ}"`} onRemove={() => { setLocalQ(""); pushParams({ q: "" }); }} />}
                  {locationLabel && appliedRadius && (
                    <Chip label={`${locationLabel} · ${appliedRadius}mi`} onRemove={clearLocation} />
                  )}
                  {dateLabel && <Chip label={dateLabel} onRemove={() => { handleDateChange("", ""); }} />}
                  {localAge && <Chip label={AGE_OPTIONS.find(o => o.value === localAge)?.label ?? localAge} onRemove={() => handleAgeChange("")} />}
                  {initialCategory && <Chip label={CATEGORIES.find(c => c.value === initialCategory)?.label ?? initialCategory} onRemove={() => pushParams({ category: "" })} />}
                  {initialMax && <Chip label={`Under $${initialMax}`} onRemove={() => pushParams({ max: "" })} />}
                  {initialDays.length > 0 && <Chip label={initialDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")} onRemove={() => pushParams({ days: "" })} />}
                  {initialTod && <Chip label={initialTod.charAt(0).toUpperCase() + initialTod.slice(1)} onRemove={() => pushParams({ tod: "" })} />}
                  <button type="button" onClick={clearAll}
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                    Clear all
                  </button>
                </div>
              )}

              {/* Radius info */}
              {locCoords && !loading && (
                <p className="text-xs text-muted-foreground">
                  {appliedRadius
                    ? `Showing results within ${appliedRadius} miles`
                    : usingBrowserGeo
                      ? "Showing all results — no camps found nearby"
                      : "Showing all results — try a different location"}
                </p>
              )}
            </div>

            {/* Result count */}
            {!loading && !error && (
              <p className="text-xs text-muted-foreground">
                {displayedResults.length} result{displayedResults.length !== 1 ? "s" : ""}
              </p>
            )}

            {/* Loading */}
            {loading && (
              <div className="rounded-card bg-card px-5">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Empty */}
            {!loading && !error && displayedResults.length === 0 && (
              <div className="py-16 text-center space-y-2">
                <p className="text-base font-medium text-foreground">No results found</p>
                <p className="text-sm text-muted-foreground">Try adjusting or clearing your filters.</p>
                {hasAnyFilter && (
                  <button type="button" onClick={clearAll}
                    className="mt-3 inline-flex rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Results */}
            {!loading && !error && displayedResults.length > 0 && (
              <div className="rounded-card bg-card px-3 sm:px-5 overflow-hidden">
                {displayedResults.map((camp) => (
                  <SearchResultRow key={camp.id} camp={camp} favIds={favIds} onToggleFav={toggleFav} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Advanced Filters Modal ── */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Category */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setModalCategory(modalCategory === c.value ? "" : c.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      modalCategory === c.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-foreground hover:border-foreground/40",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Max price</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: null,  label: "Any" },
                  { value: 100,   label: "Under $100" },
                  { value: 250,   label: "Under $250" },
                  { value: 500,   label: "Under $500" },
                  { value: 1000,  label: "Under $1,000" },
                ].map((opt) => (
                  <button
                    key={opt.value ?? "any"}
                    type="button"
                    onClick={() => setModalMaxPrice(opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      modalMaxPrice === opt.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-foreground hover:border-foreground/40",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Days of week */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Days of week</p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const active = modalDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() =>
                        setModalDays((prev) =>
                          active ? prev.filter((x) => x !== d.value) : [...prev, d.value],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-white text-foreground hover:border-foreground/40",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time of day */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Time of day</p>
              <div className="flex flex-wrap gap-2">
                {TIME_OF_DAY.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setModalTod(modalTod === t.value ? "" : t.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      modalTod === t.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-foreground hover:border-foreground/40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={clearModalFilters}
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Clear filters
            </button>
            <Button onClick={applyModalFilters} size="sm">
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground hover:bg-muted/70 transition-colors">
      {label}
      <span className="material-symbols-rounded select-none text-muted-foreground" style={{ fontSize: 12 }} aria-hidden>close</span>
    </button>
  );
}
