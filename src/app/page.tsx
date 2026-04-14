"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { CampCard, CampCardSkeleton } from "@/components/CampCard";
import type { Camp } from "@/components/CampCard";
import { AddressInput } from "@/components/ui/AddressInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

const LIMIT = 25;

const CATEGORY_LABELS: Record<string, string> = {
  arts:    "Art",
  music:   "Music",
  sports:  "Sports",
  outdoor: "Outdoor",
  stem:    "STEM",
  drama:   "Theater",
  dance:   "Dance",
  cooking: "Cooking",
  academic:"Academic",
};

const ANIMATED_TERMS = [
  "Search camps, classes, and ummmmmmmmm activities",
  "Soccer camps near me",
  "Art classes for 7-year-olds",
  "Overnight camps this summer",
  "Overnight camps in the Tri-State Area",
  "Coding bootcamp for kids",
  "STEM programs for teens",
  "Dance classes this weekend",
  "Theater camp near Chicago",
  "Gymnastics for beginners",
  "UFO building in Roswell",
  "¯\\_(ツ)_/¯",
  "anything that gets them off the couch",
  "my kid won't stop talking about Minecraft",
  "asking for a very energetic 9-year-old",
  "idk something outdoorsy?",
  "help",
  "activities that don't involve screens",
  "camp for kids who talk. a lot.",
  "my mother-in-law is visiting all summer",
];

const RECENT_SEARCHES_KEY = "wowzi_recent_searches";

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

const normalize = (s: string) => s.trim().toLowerCase();

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

    const aStart = ts(item.start_time);
    const bStart = ts(prev.start_time);
    const aUpcoming = aStart != null && aStart >= now;
    const bUpcoming = bStart != null && bStart >= now;

    if (aUpcoming && !bUpcoming) {
      map.set(key, item);
      continue;
    }
    if (!aUpcoming && bUpcoming) continue;

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

const takeUniquePrograms = (
  items: CampRow[],
  usedProgramKeys: Set<string>,
  limit: number,
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

/* ── Featured camps that rotate in the hero image ── */
const FEATURED_HERO_CAMPS: Array<{ name: string; slug: string; image: string }> = [
  {
    name: "Kids at camp having fun",
    slug: "",
    image: "/images/home-hero-kids.jpg",
  },
];

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
  const single =
    typeof c.category === "string" ? normalize(c.category) : "";
  return single === v;
};

const AGE_BUCKET_MAP: Record<string, string> = {
  "3_5": "3-5",
  "6_8": "6-8",
  "9_12": "9-12",
  "13_plus": "13+",
};

const AGE_RANGE_MAP: Record<string, [number, number]> = {
  "3_5": [3, 5],
  "6_8": [6, 8],
  "9_12": [9, 12],
  "13_plus": [13, 99],
};

const campMatchesAge = (c: CampRow, ageSelect: AgeSelect): boolean => {
  if (!ageSelect || ageSelect === "any") return true;
  const buckets = (c.meta?.age_buckets as string[] | undefined) ?? [];
  const minAge = c.meta?.min_age as number | undefined;
  const maxAge = c.meta?.max_age as number | undefined;
  // No age data → include (don't penalise incomplete listings)
  if (!buckets.length && minAge == null && maxAge == null) return true;
  if (buckets.includes("all")) return true;
  const targetBucket = AGE_BUCKET_MAP[ageSelect];
  if (targetBucket && buckets.includes(targetBucket)) return true;
  // Fall back to numeric range overlap
  if (minAge != null || maxAge != null) {
    const [lo, hi] = AGE_RANGE_MAP[ageSelect] ?? [0, 99];
    return (minAge ?? 0) <= hi && (maxAge ?? 99) >= lo;
  }
  return false;
};

type SortMode = "popular" | "featured" | "new";

const SORT_LABELS: Record<SortMode, string> = {
  popular: "Popular",
  featured: "Featured",
  new: "New and noteworthy",
};

/* ---------- date helpers ---------- */
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
  return `${formatDisplayDate(start)} \u2013 ${formatDisplayDate(end)}`;
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

/* ---------- age helpers ---------- */
type AgeSelect = "" | "any" | "3_5" | "6_8" | "9_12" | "13_plus";

const ageLabel = (v: AgeSelect) => {
  if (!v) return "Ages";
  if (v === "any") return "All ages";
  if (v === "3_5") return "Ages 3 to 5";
  if (v === "6_8") return "Ages 6 to 8";
  if (v === "9_12") return "Ages 9 to 12";
  return "Ages 13+";
};

export default function HomePage() {
  const router = useRouter();

  const [pool, setPool] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero search controls
  const [q, setQ] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [ageSelect, setAgeSelect] = useState<AgeSelect>("");

  // Search dropdown
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Animated placeholder
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(ANIMATED_TERMS[0]); // starts pre-filled

  // Grid controls
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Popular categories — fetched live, only show ones with camps
  const [popularCategories, setPopularCategories] = useState<Array<{ value: string; label: string }>>([]);

  const todayRef = useRef<Date>(new Date());

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Hero rotating camps — populated from featured camps in pool
  const [heroIndex, setHeroIndex] = useState(0);
  const heroCamps = useMemo<Array<{ name: string; slug: string; image: string }>>(() => {
    const fromPool = pool
      .filter((c) => c.featured && (c.hero_image_url || (Array.isArray(c.image_urls) && c.image_urls.length > 0) || c.image_url))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        image: c.hero_image_url ?? (Array.isArray(c.image_urls) ? c.image_urls[0] : null) ?? c.image_url ?? "",
      }))
      .filter((c) => c.image);
    return fromPool.length >= 2 ? fromPool : FEATURED_HERO_CAMPS;
  }, [pool]);

  useEffect(() => {
    if (heroCamps.length <= 1) return;
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroCamps.length);
    }, 8000);
    return () => clearInterval(id);
  }, [heroCamps.length]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase
          .from("camps")
          .select(CAMP_CARD_COLUMNS)
          .eq("is_published", true)
          .eq("is_active", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(60);

        if (dbError) {
          setError("Could not load activities.");
          setPool([]);
          return;
        }

        const deduped = dedupeByProgram(
          (data || []) as CampRow[],
          "newest",
        );
        setPool(deduped);

        // Derive popular categories from the fetched pool — only show ones with camps
        const categoryCounts: Record<string, number> = {};
        for (const camp of (data || []) as CampRow[]) {
          const cat = (camp.category as string | undefined)?.toLowerCase();
          if (cat && cat !== "general" && CATEGORY_LABELS[cat]) {
            categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
          }
        }
        const sorted = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([value]) => ({ value, label: CATEGORY_LABELS[value] }));
        setPopularCategories(sorted);
      } catch {
        setError("Something went wrong while loading activities.");
        setPool([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Animated placeholder cycling through ANIMATED_TERMS
  useEffect(() => {
    if (q) return; // Don't animate while user is typing
    let termIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      const term = ANIMATED_TERMS[termIdx];
      if (!deleting) {
        charIdx++;
        setAnimatedPlaceholder(term.slice(0, charIdx));
        if (charIdx === term.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 1800); // pause at full word
        } else {
          timeoutId = setTimeout(tick, 60);
        }
      } else {
        charIdx--;
        setAnimatedPlaceholder(term.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          termIdx = (termIdx + 1) % ANIMATED_TERMS.length;
          timeoutId = setTimeout(tick, 400); // pause before next word
        } else {
          timeoutId = setTimeout(tick, 35);
        }
      }
    }
    timeoutId = setTimeout(tick, 800);
    return () => clearTimeout(timeoutId);
  }, [q]);

  const selectedRange: DateRange | undefined = useMemo(() => {
    const from = startDate ? fromISODate(startDate) : undefined;
    const to = endDate ? fromISODate(endDate) : undefined;
    if (!from && !to) return undefined;
    return { from, to };
  }, [startDate, endDate]);

  function saveRecentSearch(term: string) {
    if (!term.trim()) return;
    const next = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 6);
    setRecentSearches(next);
    try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
  }

  function removeRecentSearch(term: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = recentSearches.filter((s) => s !== term);
    setRecentSearches(next);
    try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
  }

  function clearRecentSearches(e: React.MouseEvent) {
    e.stopPropagation();
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch {}
  }

  function doSearch(term: string) {
    setSearchFocused(false);
    saveRecentSearch(term);
    const params = new URLSearchParams();
    if (term.trim()) params.set("q", term.trim());
    if (locationText.trim()) params.set("location", locationText.trim());
    if (locationCoords) {
      params.set("loc_lat", String(locationCoords.lat));
      params.set("loc_lng", String(locationCoords.lng));
    }
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (ageSelect) params.set("age", ageSelect);
    router.push(`/search?${params.toString()}`);
  }

  const onHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) saveRecentSearch(q.trim());
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (locationText.trim()) params.set("location", locationText.trim());
    if (locationCoords) {
      params.set("loc_lat", String(locationCoords.lat));
      params.set("loc_lng", String(locationCoords.lng));
    }
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (ageSelect) params.set("age", ageSelect);
    if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
    if (sortMode) params.set("sort", sortMode);
    setSearchFocused(false);
    router.push(`/search?${params.toString()}`);
  };

  const gridItems = useMemo(() => {
    let modePool: CampRow[] = [];

    if (sortMode === "featured") {
      modePool = pool.filter((c) => !!c.featured);
      modePool.sort(
        (a, b) =>
          (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1),
      );
    } else if (sortMode === "new") {
      const windowMs = 45 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      modePool = pool.filter((c) => {
        const t = ts(c.created_at);
        return t != null && now - t <= windowMs;
      });
      modePool.sort(
        (a, b) =>
          (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1),
      );
    } else {
      modePool = [...pool].sort((a, b) => {
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        if (af !== bf) return bf - af;
        return (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1);
      });
    }

    const filtered = modePool.filter(
      (c) => campHasCategory(c, activeCategory) && campMatchesAge(c, ageSelect),
    );

    const used = new Set<string>();
    const chosen = takeUniquePrograms(filtered, used, LIMIT);

    if (chosen.length < LIMIT) {
      const fillPool = pool
        .filter((c) => campHasCategory(c, activeCategory) && campMatchesAge(c, ageSelect))
        .sort(
          (a, b) =>
            (ts(b.created_at) ?? -1) - (ts(a.created_at) ?? -1),
        );
      const fill = takeUniquePrograms(
        fillPool,
        used,
        LIMIT - chosen.length,
      );
      return [...chosen, ...fill];
    }

    return chosen;
  }, [pool, sortMode, activeCategory, ageSelect]);

  return (
    <main>
      <div className="page-container py-8">
        <div className="page-grid">
          <div className="span-12 space-y-10">
      {/* HERO */}
      <section className="grid gap-8 lg:gap-16 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-foreground text-pretty">
            Where every kid finds their thing.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            From art to adventure, explore hand-picked camps and classes in your neighborhood.
          </p>

          <form onSubmit={onHeroSearch} className="pt-2 space-y-3">
            {/* Search input + submit button */}
            <div className="flex items-center gap-2">
              <div ref={searchWrapperRef} className="relative flex-1 min-w-0">
              <div className="relative flex items-center" style={{ background: "#fff", borderRadius: "9999px" }}>
                <span className="material-symbols-rounded select-none absolute left-4 text-foreground" style={{ fontSize: 20, lineHeight: 1 }}>search</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder={animatedPlaceholder}
                  className="h-12 w-full bg-transparent pl-12 pr-4 text-sm outline-none placeholder:text-[#49454F]"
                  style={{ color: "#1C1B1F", borderRadius: "9999px" }}
                  aria-label="Search"
                  autoComplete="off"
                />
              </div>

              {/* Dropdown */}
              {searchFocused && !q && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white shadow-lg z-50 overflow-hidden py-2">

                  {/* Popular categories — only shown if we have data */}
                  {popularCategories.length > 0 && (
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Browse by category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {popularCategories.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearchFocused(false);
                              router.push(`/search?category=${encodeURIComponent(value)}`);
                            }}
                            className="rounded-lg px-3 py-1 text-xs text-foreground hover:bg-muted transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <>
                      <div className="mx-4 my-1.5 border-t border-border" />
                      <div className="px-4 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-muted-foreground">Recent searches</p>
                          <button
                            type="button"
                            onMouseDown={clearRecentSearches}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {recentSearches.map((term) => (
                          <div
                            key={term}
                            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted cursor-pointer group"
                            onMouseDown={(e) => { e.preventDefault(); doSearch(term); }}
                          >
                            <span className="text-sm text-foreground">{term}</span>
                            <button
                              type="button"
                              onMouseDown={(e) => removeRecentSearch(term, e)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity text-lg leading-none"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>

              {/* Arrow submit button — mobile only, desktop has "Start exploring" below */}
              <button
                type="submit"
                aria-label="Start exploring"
                className="sm:hidden flex items-center justify-center rounded-full shrink-0"
                style={{ background: "#E3FA4F", width: 44, height: 44 }}
              >
                <span className="material-symbols-rounded select-none text-foreground" style={{ fontSize: 22, lineHeight: 1 }}>arrow_forward</span>
              </button>
            </div>

            {/* Under-search controls: Location, Dates, Ages — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Location */}
              <AddressInput
                value={locationText}
                onChange={(val: string) => setLocationText(val)}
                placeholder="Location"
                className="h-12 rounded-full border-0 outline-none"
                style={{ background: "#fff", color: "#1C1B1F" }}
                onSelect={(selection) => {
                  const formatted = selection?.formattedAddress?.trim();
                  if (formatted) setLocationText(formatted);
                  if (selection?.location) setLocationCoords(selection.location);
                  else setLocationCoords(null);
                }}
              />

              {/* Dates */}
              <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-12 w-full rounded-full px-4 text-left text-sm outline-none transition-colors"
                    style={{ background: "#fff", color: startDate || endDate ? "#1C1B1F" : "#49454F" }}
                    aria-label="Dates"
                  >
                    <span
                      className={
                        startDate || endDate
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
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
                  <div className="mt-1">
                    <Calendar
                      mode="range"
                      numberOfMonths={isMobile ? 1 : 2}
                      selected={selectedRange}
                      defaultMonth={
                        selectedRange?.from ?? todayRef.current
                      }
                      fromDate={todayRef.current}
                      onSelect={(range) => {
                        const from = range?.from
                          ? toISODate(range.from)
                          : "";
                        const to = range?.to
                          ? toISODate(range.to)
                          : "";
                        setStartDate(from);
                        setEndDate(to);
                      }}
                      captionLayout="dropdown"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setDatesOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Ages */}
              <select
                value={ageSelect}
                onChange={(e) => setAgeSelect(e.target.value as AgeSelect)}
                className="h-12 w-full rounded-full px-4 text-sm outline-none appearance-none cursor-pointer"
                style={{ background: "#fff", color: ageSelect ? "#1C1B1F" : "#49454F", border: "none" }}
                aria-label="Ages"
              >
                <option value="" disabled hidden>Ages</option>
                <option value="any">All ages</option>
                <option value="3_5">Ages 3–5</option>
                <option value="6_8">Ages 6–8</option>
                <option value="9_12">Ages 9–12</option>
                <option value="13_plus">Ages 13+</option>
              </select>
            </div>

            {/* Desktop: standalone submit button below sub-fields */}
            <div className="hidden sm:flex flex-wrap gap-3">
              <Button type="submit" variant="default" className="h-12 px-6 rounded-full text-foreground" style={{ background: "#E3FA4F" }}>
                Start exploring
              </Button>
            </div>
          </form>
        </div>

        <div className="hidden lg:block relative">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={heroCamps[heroIndex]?.image ?? "/images/home-hero-kids.jpg"}
              alt={heroCamps[heroIndex]?.name ?? "Kids at camp having fun"}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            {/* Camp name chip */}
            {heroCamps[heroIndex]?.slug ? (
              <a
                href={`/camp/${heroCamps[heroIndex].slug}`}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm hover:bg-white transition-colors"
              >
                <span className="text-xs font-semibold text-foreground leading-none">{heroCamps[heroIndex].name}</span>
                {heroCamps.length > 1 && (
                  <span className="flex gap-0.5 ml-1">
                    {heroCamps.map((_, i) => (
                      <span
                        key={i}
                        className="block rounded-full transition-all duration-300"
                        style={{
                          width: i === heroIndex ? "12px" : "5px",
                          height: "5px",
                          background: i === heroIndex ? "var(--brand)" : "oklch(0.75 0 0)",
                        }}
                      />
                    ))}
                  </span>
                )}
              </a>
            ) : heroCamps.length > 1 ? (
              <div
                className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm"
              >
                <span className="text-xs font-semibold text-foreground leading-none">{heroCamps[heroIndex]?.name}</span>
                <span className="flex gap-0.5 ml-1">
                  {heroCamps.map((_, i) => (
                    <span
                      key={i}
                      className="block rounded-full transition-all duration-300"
                      style={{
                        width: i === heroIndex ? "12px" : "5px",
                        height: "5px",
                        background: i === heroIndex ? "var(--brand)" : "oklch(0.75 0 0)",
                      }}
                    />
                  ))}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* GRID CONTROLS + GRID */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 sm:justify-between">
          {/* Sort dropdown */}
          <Select
            value={sortMode}
            onValueChange={(v) => setSortMode(v as SortMode)}
          >
            <SelectTrigger className="w-auto rounded-full text-sm font-medium" style={{ height: "32px", padding: "0 12px 0 16px", border: "1px solid #CAC4D0", background: "transparent", color: "#49454F" }} aria-label="Sort">
              <span>{SORT_LABELS[sortMode]}</span>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="featured">{SORT_LABELS.featured}</SelectItem>
              <SelectItem value="popular">{SORT_LABELS.popular}</SelectItem>
              <SelectItem value="new">{SORT_LABELS.new}</SelectItem>
            </SelectContent>
          </Select>

          {/* Category — dropdown on mobile, chips on sm+ */}
          <div className="sm:hidden">
            <Select
              value={activeCategory}
              onValueChange={(v) => setActiveCategory(v)}
            >
              <SelectTrigger className="w-auto rounded-full text-sm font-medium" style={{ height: "32px", padding: "0 12px 0 16px", border: "1px solid #CAC4D0", background: "transparent", color: "#49454F" }} aria-label="Category">
                <span>
                  {CATEGORY_CHIPS.find((c) => c.value === activeCategory)?.label ?? "All"}
                </span>
              </SelectTrigger>
              <SelectContent position="popper">
                {CATEGORY_CHIPS.map((chip) => (
                  <SelectItem key={chip.value} value={chip.value}>
                    {chip.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category chips — sm+ only, M3 filter chips */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto py-1 sm:justify-end">
            {CATEGORY_CHIPS.map((chip) => {
              const active = chip.value === activeCategory;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setActiveCategory(chip.value)}
                  className="whitespace-nowrap rounded-full text-sm font-medium transition-colors"
                  style={{
                    height: "32px",
                    padding: "0 16px",
                    background: active ? "#E8DEF8" : "transparent",
                    color: active ? "#6750A4" : "#49454F",
                    border: active ? "none" : "1px solid #CAC4D0",
                  }}
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

        {!loading && !error && gridItems.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No activities found yet.
          </p>
        )}

        {!loading && !error && gridItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {gridItems.slice(0, LIMIT).map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}
      </section>
          </div>
        </div>
      </div>
    </main>
  );
}
