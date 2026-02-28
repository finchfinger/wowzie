"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [ageSelect, setAgeSelect] = useState<AgeSelect>("");

  // Grid controls
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [activeCategory, setActiveCategory] = useState<string>("all");

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
          .order("created_at", { ascending: false })
          .limit(220);

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
      } catch {
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
    if (locationText.trim())
      params.set("location", locationText.trim());
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (ageSelect) params.set("age", ageSelect);
    if (activeCategory && activeCategory !== "all")
      params.set("category", activeCategory);
    if (sortMode) params.set("sort", sortMode);

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

    const filtered = modePool.filter((c) =>
      campHasCategory(c, activeCategory),
    );

    const used = new Set<string>();
    const chosen = takeUniquePrograms(filtered, used, LIMIT);

    if (chosen.length < LIMIT) {
      const fillPool = pool
        .filter((c) => campHasCategory(c, activeCategory))
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
  }, [pool, sortMode, activeCategory]);

  return (
    <main className="flex-1 max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* HERO */}
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Camps &amp; classes near you
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground">
            Where every kid finds
            <br />
            their thing.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md">
            From art to adventure, explore hand-picked camps and
            classes in your neighborhood. Compare options, save
            favorites, and book in a few taps.
          </p>

          <form onSubmit={onHeroSearch} className="pt-2 space-y-3">
            {/* Search input */}
            <div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search camps, classes, and activities"
                className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
                aria-label="Search"
              />
            </div>

            {/* Under-search controls: Location, Dates, Ages */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Location */}
              <AddressInput
                value={locationText}
                onChange={(val: string) => setLocationText(val)}
                placeholder="Location"
                className="h-11"
                onSelect={(selection) => {
                  const formatted =
                    selection?.formattedAddress?.trim();
                  if (formatted) setLocationText(formatted);
                }}
              />

              {/* Dates */}
              <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-left text-sm outline-none transition-colors hover:bg-gray-50 focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10"
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
              <div className="h-11">
                <Select
                  value={ageSelect}
                  onValueChange={(v) =>
                    setAgeSelect(v as AgeSelect)
                  }
                >
                  <SelectTrigger
                    className="h-11 w-full"
                    aria-label="Ages"
                  >
                    <span
                      className={
                        ageSelect
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {ageLabel(ageSelect)}
                    </span>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="any">All ages</SelectItem>
                    <SelectItem value="3_5">
                      Ages 3 to 5
                    </SelectItem>
                    <SelectItem value="6_8">
                      Ages 6 to 8
                    </SelectItem>
                    <SelectItem value="9_12">
                      Ages 9 to 12
                    </SelectItem>
                    <SelectItem value="13_plus">
                      Ages 13+
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="default" className="px-5">
                Start exploring
              </Button>
            </div>
          </form>
        </div>

        <div className="relative">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home-hero-kids.jpg"
              alt="Kids at camp having fun"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* GRID CONTROLS + GRID */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Sort dropdown (shadcn Select) */}
          <div className="w-full sm:w-64">
            <Select
              value={sortMode}
              onValueChange={(v) => setSortMode(v as SortMode)}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Sort">
                <span className="text-foreground">
                  {SORT_LABELS[sortMode]}
                </span>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="featured">
                  {SORT_LABELS.featured}
                </SelectItem>
                <SelectItem value="popular">
                  {SORT_LABELS.popular}
                </SelectItem>
                <SelectItem value="new">
                  {SORT_LABELS.new}
                </SelectItem>
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
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
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
    </main>
  );
}
