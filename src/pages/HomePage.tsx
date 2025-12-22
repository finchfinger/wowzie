// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CampCard } from "../components/CampCard";
import type { Camp } from "../components/CampCard";
import { Button } from "../components/ui/Button";

const LIMIT = 5;

const CAMP_COLUMNS = `
  id,
  program_id,
  slug,
  name,
  description,
  location,
  image_url,
  hero_image_url,
  price_cents,
  status,
  meta,
  is_published,
  is_active,
  featured,
  category,
  categories,
  listing_type,
  series_weeks,
  schedule_days,
  start_local,
  end_local,
  start_time,
  end_time,
  created_at
`;

type HomeRow = {
  title: string;
  subtitle?: string;
  camps: Camp[];
};

type CampRow = Camp & {
  program_id?: string | null;
  start_time?: string | null;
  created_at?: string | null;
};

const getCitySeed = () => {
  const fromStorage =
    typeof window !== "undefined" ? window.localStorage.getItem("wowzie_city") : null;
  return (fromStorage || "Chicago").trim();
};

const getRecentCategorySeed = () => {
  const fromStorage =
    typeof window !== "undefined"
      ? window.localStorage.getItem("wowzie_recent_category")
      : null;
  return (fromStorage || "music").trim();
};

const programKey = (c: CampRow) => (c.program_id && c.program_id.trim() ? c.program_id.trim() : c.id);

const ts = (iso?: string | null) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/**
 * Dedupes a pool so you only keep ONE listing per program.
 * Mode:
 *  - "soonest": choose the next upcoming start_time when possible (best for Starting soon)
 *  - "newest": choose the newest created_at (best for Featured/Near/Exploring/Popular)
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

    // Prefer upcoming over non-upcoming
    if (aUpcoming && !bUpcoming) {
      map.set(key, item);
      continue;
    }
    if (!aUpcoming && bUpcoming) {
      continue;
    }

    // If both upcoming, pick the sooner one
    if (aUpcoming && bUpcoming && aStart != null && bStart != null) {
      if (aStart < bStart) map.set(key, item);
      continue;
    }

    // If neither is upcoming, fall back to newest created
    const aCreated = ts(item.created_at) ?? -1;
    const bCreated = ts(prev.created_at) ?? -1;
    if (aCreated > bCreated) map.set(key, item);
  }

  return Array.from(map.values());
}

/**
 * Ensures we don't repeat the same program across rows.
 * Tracks by program_id when present, else by id.
 */
const takeUniquePrograms = (items: CampRow[], usedProgramKeys: Set<string>, limit: number) => {
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
    .select(CAMP_COLUMNS)
    .eq("is_published", true)
    .eq("is_active", true);

// Queries
const queryFeatured = () =>
  baseQuery().eq("featured", true).order("created_at", { ascending: false }).limit(50);

const queryNearYou = (city: string) =>
  baseQuery().ilike("location", `%${city}%`).order("created_at", { ascending: false }).limit(75);

const queryStartingSoon = () => {
  const nowIso = new Date().toISOString();
  return baseQuery()
    .not("start_time", "is", null)
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true })
    .limit(100);
};

const queryBecauseExploring = (category: string) =>
  baseQuery().eq("category", category).order("created_at", { ascending: false }).limit(75);

const queryPopularHeuristic = () =>
  baseQuery()
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(150);

const queryFallbackPool = () =>
  baseQuery().order("created_at", { ascending: false }).limit(250);

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const city = useMemo(() => getCitySeed(), []);
  const recentCategory = useMemo(() => getRecentCategorySeed(), []);

  const [rows, setRows] = useState<HomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [featuredRes, nearRes, soonRes, exploringRes, popularRes, fallbackRes] =
          await Promise.all([
            queryFeatured(),
            queryNearYou(city),
            queryStartingSoon(),
            queryBecauseExploring(recentCategory),
            queryPopularHeuristic(),
            queryFallbackPool(),
          ]);

        const firstError =
          featuredRes.error ||
          nearRes.error ||
          soonRes.error ||
          exploringRes.error ||
          popularRes.error ||
          fallbackRes.error;

        if (firstError) {
          console.error("Supabase error(s):", {
            featured: featuredRes.error,
            near: nearRes.error,
            soon: soonRes.error,
            exploring: exploringRes.error,
            popular: popularRes.error,
            fallback: fallbackRes.error,
          });
          setError("Could not load activities. Check your table or permissions.");
          setRows([]);
          setLoading(false);
          return;
        }

        const featuredRaw = (featuredRes.data || []) as CampRow[];
        const nearRaw = (nearRes.data || []) as CampRow[];
        const soonRaw = (soonRes.data || []) as CampRow[];
        const exploringRaw = (exploringRes.data || []) as CampRow[];
        const popularRaw = (popularRes.data || []) as CampRow[];
        const fallbackRaw = (fallbackRes.data || []) as CampRow[];

        // Dedup within each pool by program
        const featuredPool = dedupeByProgram(featuredRaw, "newest");
        const nearPool = dedupeByProgram(nearRaw, "newest");
        const soonPool = dedupeByProgram(soonRaw, "soonest");
        const exploringPool = dedupeByProgram(exploringRaw, "newest");
        const popularPool = dedupeByProgram(popularRaw, "newest");
        const fallbackPool = dedupeByProgram(fallbackRaw, "newest");

        const usedProgramKeys = new Set<string>();

        const buildRow = (pool: CampRow[]) => {
          const chosen = takeUniquePrograms(pool, usedProgramKeys, LIMIT);
          if (chosen.length < LIMIT) {
            const fill = takeUniquePrograms(fallbackPool, usedProgramKeys, LIMIT - chosen.length);
            return [...chosen, ...fill];
          }
          return chosen;
        };

        const nextRows: HomeRow[] = [
          {
            title: "Featured",
            subtitle: "Hand-picked activities hosts love",
            camps: buildRow(featuredPool) as unknown as Camp[],
          },
          {
            title: "Near you",
            subtitle: `In and around ${city}`,
            camps: buildRow(nearPool) as unknown as Camp[],
          },
          {
            title: "Starting soon",
            subtitle: "Upcoming options you can book next",
            camps: buildRow(soonPool) as unknown as Camp[],
          },
          {
            title: "Because you’re exploring",
            subtitle: `More in ${recentCategory}`,
            camps: buildRow(exploringPool) as unknown as Camp[],
          },
          {
            title: "Popular right now",
            subtitle: "What parents are booking and saving",
            camps: buildRow(popularPool) as unknown as Camp[],
          },
        ].filter((r) => r.camps.length > 0);

        setRows(nextRows);
      } catch (err) {
        console.error("Unexpected error loading homepage:", err);
        setError("Something went wrong while loading activities.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [city, recentCategory]);

  const hasAny = rows.some((r) => r.camps.length > 0);

  return (
    <main className="flex-1 max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-10">
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
            From art to adventure, explore hand-picked camps and classes in your
            neighborhood. Compare options, save favorites, and book in a few taps.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              className="px-5 py-2.5"
              onClick={() => navigate("/search")}
            >
              Start exploring
            </Button>
            <Button
              variant="subtle"
              className="px-5 py-2.5"
              onClick={() => navigate("/host/listings")}
            >
              List an activity
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-3xl bg-gray-200 shadow-md">
            <img
              src="/images/home-hero-kids.jpg"
              alt="Kids at camp having fun"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {loading && <p className="text-gray-600 text-sm">Loading activities…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && !hasAny && (
        <p className="text-gray-700 text-sm">
          No activities found yet. Add rows to your “camps” table in Supabase.
        </p>
      )}

      {!loading && !error && hasAny && (
        <div className="space-y-10">
          {rows.map((row) => (
            <section key={row.title} className="space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{row.title}</h2>
                {row.subtitle && <span className="text-xs text-gray-500">{row.subtitle}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {row.camps.slice(0, LIMIT).map((camp) => (
                  <CampCard key={camp.id} camp={camp} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

export default HomePage;
