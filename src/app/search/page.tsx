"use client";

import { Suspense, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPriceUnit } from "@/lib/pricing";
import { Heart, Search, X } from "lucide-react";
import Link from "next/link";
import type { Camp } from "@/components/CampCard";

/* ── Constants ── */

const SELECT_COLUMNS = `
  id,
  program_id,
  slug,
  name,
  description,
  location,
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
  created_at
`;

const CATEGORIES = [
  "Art", "Sports", "STEM", "Music", "Outdoor",
  "Academic", "Sleepover", "Theater", "Dance", "Cooking",
];

const AGE_OPTIONS = [
  { value: "any",      label: "All ages" },
  { value: "3_5",      label: "Ages 3–5" },
  { value: "6_8",      label: "Ages 6–8" },
  { value: "9_12",     label: "Ages 9–12" },
  { value: "13_plus",  label: "Ages 13+" },
];

const AGE_BUCKET_MAP: Record<string, string> = {
  "3_5": "3-5", "6_8": "6-8", "9_12": "9-12", "13_plus": "13+",
};
const AGE_RANGE_MAP: Record<string, [number, number]> = {
  "3_5": [3, 5], "6_8": [6, 8], "9_12": [9, 12], "13_plus": [13, 99],
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

type CampRow = Camp & {
  program_id?: string | null;
  created_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  image_urls?: string[] | null;
};

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
    <div className="flex items-center gap-3 sm:gap-4 py-4 border-b border-border last:border-0 min-w-0">
      <Link href={`/camp/${camp.slug}`} className="shrink-0">
        <div className="relative h-[72px] w-[72px] rounded-xl overflow-hidden bg-muted">
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
            <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground/40"}`} />
          </button>
        </div>
        {dateStr && <p className="text-sm text-muted-foreground truncate">{dateStr}</p>}
        {timeStr && <p className="text-sm text-muted-foreground truncate">{timeStr}</p>}
        {locationStr && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{locationStr}</p>}
      </div>

      {price && (
        <div className="text-right shrink-0">
          <span className="font-semibold text-foreground text-sm">{price}</span>
          <span className="text-muted-foreground text-sm"> {priceUnit}</span>
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border animate-pulse">
      <div className="h-[72px] w-[72px] rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-36 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="h-4 w-20 rounded bg-muted shrink-0" />
    </div>
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

  // URL-derived values (drive the DB query)
  const initialQ        = searchParams.get("q")?.trim() || "";
  const initialCategory = searchParams.get("category")?.trim() || "";
  const initialAge      = searchParams.get("age")?.trim() || "";
  const groupMode       = searchParams.get("group")?.trim() || "";
  const tags            = splitCsv(searchParams.get("tags"));
  const listingType     = searchParams.get("type")?.trim() || "";
  const seriesWeeks     = toInt(searchParams.get("weeks"));
  const day             = searchParams.get("day")?.trim() ? normalizeDay(searchParams.get("day")!.trim()) : "";
  const timeOfDay       = searchParams.get("tod")?.trim() || "";
  const featured        = searchParams.get("featured") === "1" || searchParams.get("featured") === "true";
  const programId       = searchParams.get("program")?.trim() || "";
  const minDollars      = toInt(searchParams.get("min"));
  const maxDollars      = toInt(searchParams.get("max"));
  const minCents        = minDollars != null ? minDollars * 100 : null;
  const maxCents        = maxDollars != null ? maxDollars * 100 : null;

  // Local controlled state for filter inputs
  const [localQ, setLocalQ]               = useState(initialQ);
  const [localCategory, setLocalCategory] = useState(initialCategory);
  const [localAge, setLocalAge]           = useState(initialAge);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if URL changes externally (e.g., back button)
  useEffect(() => { setLocalQ(initialQ); },        [initialQ]);
  useEffect(() => { setLocalCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { setLocalAge(initialAge); },    [initialAge]);

  const pushFilters = useCallback((q: string, category: string, age: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim()); else params.delete("q");
    if (category) params.set("category", category); else params.delete("category");
    if (age) params.set("age", age); else params.delete("age");
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleQChange = (val: string) => {
    setLocalQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushFilters(val, localCategory, localAge), 400);
  };

  const handleCategoryChange = (val: string) => { setLocalCategory(val); pushFilters(localQ, val, localAge); };
  const handleAgeChange      = (val: string) => { setLocalAge(val);      pushFilters(localQ, localCategory, val); };

  const pushParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val); else params.delete(key);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  // DB results
  const [results, setResults] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Favorites
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("camp_favorites").select("camp_id").eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFavIds(new Set(data.map((r: { camp_id: string }) => r.camp_id)));
      });
  }, [user?.id]);

  const toggleFav = async (campId: string) => {
    if (!user?.id) return;
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

  const depKey = useMemo(
    () => JSON.stringify({ initialQ, initialCategory, tags, listingType, seriesWeeks, day, timeOfDay, featured, minCents, maxCents, programId, groupMode }),
    [initialQ, initialCategory, tags, listingType, seriesWeeks, day, timeOfDay, featured, minCents, maxCents, programId, groupMode],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("camps").select(SELECT_COLUMNS)
        .eq("is_published", true).eq("is_active", true)
        .order("created_at", { ascending: false });

      if (initialQ) { const like = `%${initialQ}%`; query = query.or(`name.ilike.${like},description.ilike.${like}`); }
      if (programId)        query = query.eq("program_id", programId);
      if (initialCategory)  query = query.eq("category", initialCategory);
      if (featured)         query = query.eq("featured", true);
      if (listingType)      query = query.eq("listing_type", listingType);
      if (seriesWeeks != null) query = query.eq("series_weeks", seriesWeeks);
      if (day)              query = query.contains("schedule_days", [day]);
      if (timeOfDay)        query = query.eq("time_of_day", timeOfDay);
      if (tags.length > 0)  query = query.overlaps("categories", tags);
      if (minCents != null) query = query.gte("price_cents", minCents);
      if (maxCents != null) query = query.lte("price_cents", maxCents);

      const { data, error: dbError } = await query;
      if (dbError) { setError("Sorry, we couldn't load results."); setResults([]); }
      else {
        const rows = (data || []) as CampRow[];
        setResults(groupMode === "program" ? dedupeByProgram(rows) : rows);
      }
      setLoading(false);
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  const displayedResults = useMemo(
    () => results.filter((c) => campMatchesAge(c, initialAge)),
    [results, initialAge],
  );

  const hasActiveFilters = !!(localQ || localCategory || localAge || maxDollars);

  const clearAll = () => {
    setLocalQ(""); setLocalCategory(""); setLocalAge("");
    router.replace("/search", { scroll: false });
  };

  return (
    <main>
      <div className="page-container py-8">
        <div className="page-grid">
          <div className="span-8-center space-y-5">

        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
          Let&apos;s find something awesome
        </h1>

        {/* ── Filter bar ── */}
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={localQ}
              onChange={(e) => handleQChange(e.target.value)}
              placeholder="What type of activity are you interested in?"
              className="h-11 w-full rounded-lg border border-input bg-white pl-9 pr-9 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
              autoComplete="off"
            />
            {localQ && (
              <button type="button" onClick={() => { setLocalQ(""); pushFilters("", localCategory, localAge); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select value={localCategory} onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none hover:bg-gray-50 transition-colors appearance-none cursor-pointer"
              style={{ color: localCategory ? undefined : "var(--muted-foreground)" }}>
              <option value="">Category</option>
              {CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>

            <select value={localAge} onChange={(e) => handleAgeChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none hover:bg-gray-50 transition-colors appearance-none cursor-pointer"
              style={{ color: localAge ? undefined : "var(--muted-foreground)" }}>
              <option value="">All ages</option>
              {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={maxDollars ?? ""} onChange={(e) => pushParam("max", e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none hover:bg-gray-50 transition-colors appearance-none cursor-pointer"
              style={{ color: maxDollars ? undefined : "var(--muted-foreground)" }}>
              <option value="">Any price</option>
              <option value="100">Under $100</option>
              <option value="250">Under $250</option>
              <option value="500">Under $500</option>
              <option value="1000">Under $1,000</option>
            </select>

          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {localQ && (
                <Chip label={`"${localQ}"`} onRemove={() => { setLocalQ(""); pushFilters("", localCategory, localAge); }} />
              )}
              {localCategory && (
                <Chip label={localCategory} onRemove={() => handleCategoryChange("")} />
              )}
              {localAge && (
                <Chip label={AGE_OPTIONS.find(o => o.value === localAge)?.label ?? localAge} onRemove={() => handleAgeChange("")} />
              )}
              {maxDollars && (
                <Chip label={`Under $${maxDollars}`} onRemove={() => pushParam("max", "")} />
              )}
              <button type="button" onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors ml-1">
                Clear all
              </button>
            </div>
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
          <div className="rounded-2xl border border-border bg-card px-5">
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
            {hasActiveFilters && (
              <button type="button" onClick={clearAll}
                className="mt-3 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && !error && displayedResults.length > 0 && (
          <div className="rounded-2xl border border-border bg-card px-3 sm:px-5 overflow-hidden">
            {displayedResults.map((camp) => (
              <SearchResultRow key={camp.id} camp={camp} favIds={favIds} onToggleFav={toggleFav} />
            ))}
          </div>
        )}

      </div>
        </div>
      </div>
    </main>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-muted/70 transition-colors">
      {label}
      <X className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
