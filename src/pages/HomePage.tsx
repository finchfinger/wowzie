// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CampCard, CampCardSkeleton } from "../components/CampCard";
import type { Camp } from "../components/CampCard";
import { Button } from "../components/ui/Button";
import { AddressInput } from "../components/ui/AddressInput";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "../components/ui/Select";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import type { DateRange } from "react-day-picker";

const LIMIT = 25;

const CAMP_CARD_COLUMNS = `
  id,
  program_id,
  slug,
  name,
  location,
  image_url,
  price_cents,
  category,
  categories,
  listing_type,
  schedule_days,
  start_time,
  created_at,
  featured,
  meta,
  hero_image_url,
  image_urls
`;

type CampRow = Camp & {
  program_id?: string | null;
  start_time?: string | null;
  created_at?: string | null;
  featured?: boolean | null;
  category?: string | null;
  location?: string | null;
  listing_type?: string | null;
  categories?: string[] | null;
};

const programKey = (c: CampRow) => {
  const pid = (c.program_id || "").trim();
  return pid ? pid : c.id;
};

const ts = (iso?: string | null) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/**
 * Dedupes a pool so you only keep ONE listing per program.
 * Mode:
 *  - "soonest": choose the next upcoming start_time when possible
 *  - "newest": choose the newest created_at
 */
function dedupeByProgram(items: CampRow[], mode: "soonest" | "newest") {
  const map = new Map<string, CampRow>();
  const now = Date.now();

  for (const item of items) {
    if (!item?.id) continue;

    const key = programKey(item);
    const prev = map.get(key);

    if (!prev) {
      map.set(key, item);
      continue;
    }

    if (mode === "newest") {
      const a = ts(item.created_at) ?? -1;
      const b = ts(prev.created_at) ?? -1;
      if (a > b) map.set(key, item);
      continue;
    }

    // mode === "soonest"
    const aStart = ts(item.start_time);
    const bStart = ts(prev.start_time);

    const aUpcoming = aStart != null && aStart >= now;
    const bUpcoming = bStart != null && bStart >= now;

    if (aUpcoming && !bUpcoming) {
      map.set(key, item);
      continue;
    }
    if (!aUpcoming && bUpcoming) {
      continue;
    }

    if (aUpcoming && bUpcoming && aStart != null && bStart != null) {
      if (aStart < bStart) map.set(key, item);
      continue;
    }

    const aCreated = ts(item.created_at) ?? -1;
    const bCreated = ts(prev.created_at) ?? -1;
    if (aCreated > bCreated) map.set(key, item);
  }

  return Array.from(map.values());
}

/**
 * Ensures we don't repeat the same program.
 * Tracks by program_id when present, else by id.
 */
const takeUniquePrograms = (
  items: CampRow[],
  usedProgramKeys: Set<string>,
  limit: number
) => {
  const out: CampRow[] = [];
  for (const item of items) {
    if (!item?.id) continue;
    const key = programKey(item);
    if (usedProgramKeys.has(key)) continue;
    usedProgramKeys.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
};

// Base query builder
const baseQuery = () =>
  supabase
    .from("camps")
    .select(CAMP_CARD_COLUMNS)
    .eq("is_published", true)
    .eq("is_active", true);

const queryPool = () =>
  baseQuery().order("created_at", { ascending: false }).limit(220);

const normalize = (s: string) => s.trim().toLowerCase();

/* ---------- hero date label helpers (MM/DD/YYYY) ---------- */
const formatDisplayDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
};

const formatDatesLabel = (start: string, end: string) => {
  if (!start && !end) return "Dates";
  if (start && !end) return formatDisplayDate(start);
  if (!start && end) return formatDisplayDate(end);
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
};

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
/* --------------------------------------------------------- */

type SortMode = "popular" | "featured" | "new";

const SORT_LABELS: Record<SortMode, string> = {
  popular: "Popular",
  featured: "Featured",
  new: "New and noteworthy",
};

const CATEGORY_CHIPS: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Art", value: "art" },
  { label: "Sports", value: "sports" },
  { label: "STEM", value: "stem" },
  { label: "Music", value: "music" },
  { label: "Outdoor", value: "outdoor" },
  { label: "Academic", value: "academic" },
  { label: "Sleepover", value: "sleepover" },
];

const campHasCategory = (c: CampRow, selectedValue: string) => {
  if (!selectedValue || selectedValue === "all") return true;

  const v = normalize(selectedValue);

  const cats = Array.isArray(c.categories) ? c.categories : [];
  for (const cat of cats) {
    if (typeof cat === "string" && normalize(cat) === v) return true;
  }

  const single = typeof c.category === "string" ? normalize(c.category) : "";
  return single === v;
};

// Empty string means placeholder state.
type AgeSelect = "" | "any" | "3_5" | "6_8" | "9_12" | "13_plus";

const ageLabel = (v: AgeSelect) => {
  if (!v) return "Ages";
  if (v === "any") return "All ages";
  if (v === "3_5") return "Ages 3 to 5";
  if (v === "6_8") return "Ages 6 to 8";
  if (v === "9_12") return "Ages 9 to 12";
  return "Ages 13+";
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [pool, setPool] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero search controls
  const [q, setQ] = useState("");
  const [locationText, setLocationText] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datesOpen, setDatesOpen] = useState(false);

  // Placeholder until user selects
  const [ageSelect, setAgeSelect] = useState<AgeSelect>("");

  // Grid controls
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const todayRef = useRef<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const poolRes = await queryPool();

        if (poolRes.error) {
          console.error("Supabase error:", poolRes.error);
          setError("Could not load activities. Check your table or permissions.");
          setPool([]);
          return;
        }

        const poolRaw = (poolRes.data || []) as CampRow[];
        const deduped = dedupeByProgram(poolRaw, "newest");
        setPool(deduped);
      } catch (err) {
        console.error("Unexpected error loading homepage:", err);
        setError("Something went wrong while loading activities.");
        setPool([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectedRange: DateRange | undefined = useMemo(() => {
    const from = startDate ? fromISODate(startDate) : undefined;
    const to = endDate ? fromISODate(endDate) : undefined;
    if (!from && !to) return undefined;
    return { from, to };
  }, [startDate, endDate]);

  const onHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (q.trim()) params.set("q", q.trim());
    if (locationText.trim()) params.set("location", locationText.trim());

    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);

    if (ageSelect) params.set("age", ageSelect);

    if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
    if (sortMode) params.set("sort", sortMode);

    navigate(`/search?${params.toString()}`);
  };

  const gridItems = useMemo(() => {
    const fallbackPool = pool;

    let modePool: CampRow[] = [];

    if (sortMode === "featured") {
      modePool = pool.filter((c) => !!c.featured);
      modePool = [...modePool].sort(
        (a, b) => (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1)
      );
    } else if (sortMode === "new") {
      const now = Date.now();
      const windowMs = 45 * 24 * 60 * 60 * 1000;
      modePool = pool.filter((c) => {
        const t = ts(c.created_at);
        return t != null && now - t <= windowMs;
      });
      modePool = [...modePool].sort(
        (a, b) => (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1)
      );
    } else {
      modePool = [...pool].sort((a, b) => {
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        if (af !== bf) return bf - af;
        return (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1);
      });
    }

    const filteredModePool = modePool.filter((c) => campHasCategory(c, activeCategory));

    const used = new Set<string>();
    const chosen = takeUniquePrograms(filteredModePool, used, LIMIT);

    if (chosen.length < LIMIT) {
      const fillPool = fallbackPool.filter((c) => campHasCategory(c, activeCategory)).slice();
      fillPool.sort((a, b) => (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1));

      const fill = takeUniquePrograms(fillPool, used, LIMIT - chosen.length);
      return [...chosen, ...fill];
    }

    return chosen;
  }, [pool, sortMode, activeCategory]);

  const hasAny = gridItems.length > 0;

  return (
    <main className="flex-1 max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* HERO */}
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Camps &amp; classes near you
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900">
            Where every kid finds
            <br />
            their thing.
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-md">
            From art to adventure, explore hand-picked camps and classes in your neighborhood.
            Compare options, save favorites, and book in a few taps.
          </p>

          <form onSubmit={onHeroSearch} className="pt-2 space-y-3">
            {/* Search input */}
            <div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search camps, classes, and activities"
                className="h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                aria-label="Search"
              />
            </div>

            {/* Under-search controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Location */}
              <AddressInput
                value={locationText}
                onChange={(val: string) => setLocationText(val)}
                placeholder="Location"
                className="h-11"
                onSelect={(selection: any) => {
                  const formatted =
                    typeof selection?.formattedAddress === "string"
                      ? selection.formattedAddress
                      : typeof selection?.formatted_address === "string"
                      ? selection.formatted_address
                      : typeof selection?.label === "string"
                      ? selection.label
                      : null;

                  if (formatted && formatted.trim()) setLocationText(formatted.trim());
                }}
              />

              {/* Dates */}
              <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-left text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                    aria-label="Dates"
                  >
                    <span className={startDate || endDate ? "text-gray-900" : "text-gray-500"}>
                      {formatDatesLabel(startDate, endDate)}
                    </span>
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  className="w-[min(560px,calc(100vw-2rem))] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Dates</div>

                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="text-sm font-medium text-gray-700 hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-2">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={selectedRange}
                      defaultMonth={selectedRange?.from ?? todayRef.current}
                      fromDate={todayRef.current}
                      onSelect={(range) => {
                        const from = range?.from ? toISODate(range.from) : "";
                        const to = range?.to ? toISODate(range.to) : "";
                        setStartDate(from);
                        setEndDate(to);
                      }}
                      captionLayout="dropdown"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {startDate || endDate ? formatDatesLabel(startDate, endDate) : "Select a range"}
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      className="h-10 px-4"
                      onClick={() => setDatesOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Ages */}
              <div className="h-11">
                <Select value={ageSelect} onValueChange={(v) => setAgeSelect(v as AgeSelect)}>
                  <SelectTrigger
                    className="h-11 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                    aria-label="Ages"
                  >
                    <span className={ageSelect ? "text-gray-900" : "text-gray-500"}>
                      {ageLabel(ageSelect)}
                    </span>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="any">All ages</SelectItem>
                    <SelectItem value="3_5">Ages 3 to 5</SelectItem>
                    <SelectItem value="6_8">Ages 6 to 8</SelectItem>
                    <SelectItem value="9_12">Ages 9 to 12</SelectItem>
                    <SelectItem value="13_plus">Ages 13+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" className="px-5 py-2.5" type="submit">
                Start exploring
              </Button>
            </div>
          </form>
        </div>

        <div className="relative">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-200">
            <img
              src="/images/home-hero-kids.jpg"
              alt="Kids at camp having fun"
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* COLLAPSED GRID CONTROLS */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Sort dropdown (shadcn) */}
          <div className="w-full sm:w-64">
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger
                className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                aria-label="Sort"
              >
                <span className="text-gray-900">{SORT_LABELS[sortMode]}</span>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="featured">{SORT_LABELS.featured}</SelectItem>
                <SelectItem value="popular">{SORT_LABELS.popular}</SelectItem>
                <SelectItem value="new">{SORT_LABELS.new}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category chips */}
          <div className="flex w-full items-center gap-2 overflow-x-auto py-2 sm:justify-end">
            {CATEGORY_CHIPS.map((chip) => {
              const active = chip.value === activeCategory;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setActiveCategory(chip.value)}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10",
                    active
                      ? "bg-violet-50 text-violet-900 ring-violet-200"
                      : "bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {Array.from({ length: LIMIT }).map((_, i) => (
              <CampCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && !error && !hasAny && (
          <p className="text-gray-700 text-sm">
            No activities found yet. Add rows to your “camps” table in Supabase.
          </p>
        )}

        {!loading && !error && hasAny && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {gridItems.slice(0, LIMIT).map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default HomePage;
