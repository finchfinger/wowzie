// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CampCard, CampCardSkeleton } from "../components/CampCard";
import type { Camp } from "../components/CampCard";
import { Button } from "../components/ui/Button";

const LIMIT = 5;

/**
 * Homepage is card-first.
 * Keep this select thin so / loads fast.
 * If CampCard ever needs an extra field, add it here only.
 */
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

type HomeRow = {
  title: string;
  camps: Camp[];
  seeMore?: {
    label: string;
    to: string;
  };
};

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

const getCitySeed = () => {
  const fromStorage =
    typeof window !== "undefined"
      ? window.localStorage.getItem("wowzie_city")
      : null;
  return (fromStorage || "Chicago").trim();
};

const getRecentCategorySeed = () => {
  const fromStorage =
    typeof window !== "undefined"
      ? window.localStorage.getItem("wowzie_recent_category")
      : null;
  return (fromStorage || "music").trim();
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

// Base query builder (thin columns)
const baseQuery = () =>
  supabase
    .from("camps")
    .select(CAMP_CARD_COLUMNS)
    .eq("is_published", true)
    .eq("is_active", true);

// Two-query homepage strategy:
// 1) A general recent pool for most rows
// 2) A starting-soon pool for the "Starting soon" row
const queryPool = () =>
  baseQuery().order("created_at", { ascending: false }).limit(180);

const queryStartingSoon = () => {
  const nowIso = new Date().toISOString();
  return baseQuery()
    .not("start_time", "is", null)
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true })
    .limit(120);
};

const normalize = (s: string) => s.trim().toLowerCase();

const includesCity = (location: string | null | undefined, city: string) => {
  const loc = normalize(location || "");
  const c = normalize(city);
  if (!loc || !c) return false;
  return loc.includes(c);
};

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
        const [poolRes, soonRes] = await Promise.all([
          queryPool(),
          queryStartingSoon(),
        ]);

        const firstError = poolRes.error || soonRes.error;
        if (firstError) {
          console.error("Supabase error(s):", {
            pool: poolRes.error,
            soon: soonRes.error,
          });
          setError("Could not load activities. Check your table or permissions.");
          setRows([]);
          return;
        }

        const poolRaw = (poolRes.data || []) as CampRow[];
        const soonRaw = (soonRes.data || []) as CampRow[];

        // Dedup within each pool by program
        const pool = dedupeByProgram(poolRaw, "newest");
        const soonPool = dedupeByProgram(soonRaw, "soonest");

        // Derived pools for each row
        const featuredPool = pool.filter((c) => !!c.featured);
        const nearPool = pool.filter((c) => includesCity(c.location, city));
        const recommendedPool = pool.filter(
          (c) => (c.category || "").trim() === recentCategory
        );

        // Popular heuristic: featured first, then newest
        const popularPool = [...pool].sort((a, b) => {
          const af = a.featured ? 1 : 0;
          const bf = b.featured ? 1 : 0;
          if (af !== bf) return bf - af;
          const at = ts(a.created_at) ?? -1;
          const bt = ts(b.created_at) ?? -1;
          return bt - at;
        });

        const fallbackPool = pool;

        const usedProgramKeys = new Set<string>();

        const buildRow = (poolIn: CampRow[]) => {
          const chosen = takeUniquePrograms(poolIn, usedProgramKeys, LIMIT);
          if (chosen.length < LIMIT) {
            const fill = takeUniquePrograms(
              fallbackPool,
              usedProgramKeys,
              LIMIT - chosen.length
            );
            return [...chosen, ...fill];
          }
          return chosen;
        };

        const nextRows: HomeRow[] = [
          {
            title: "Featured",
            camps: buildRow(featuredPool) as unknown as Camp[],
            seeMore: { label: "See more", to: "/search?featured=true" },
          },
          {
            title: "Near you",
            camps: buildRow(nearPool) as unknown as Camp[],
            seeMore: { label: "See more", to: `/search?city=${encodeURIComponent(city)}` },
          },
          {
            title: "Starting soon",
            camps: buildRow(soonPool) as unknown as Camp[],
            seeMore: { label: "See more", to: "/search?sort=starting_soon" },
          },
          {
            title: "Recommended for you",
            camps: buildRow(recommendedPool) as unknown as Camp[],
            seeMore: {
              label: "See more",
              to: `/search?category=${encodeURIComponent(recentCategory)}`,
            },
          },
          {
            title: "Popular right now",
            camps: buildRow(popularPool) as unknown as Camp[],
            seeMore: { label: "See more", to: "/search?sort=popular" },
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

  const skeletonRows: Array<{ title: string }> = [
    { title: "Featured" },
    { title: "Near you" },
    { title: "Starting soon" },
    { title: "Recommended for you" },
    { title: "Popular right now" },
  ];

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
              onClick={() => navigate("/host/dashboard")}
            >
              List an activity
            </Button>
          </div>
        </div>

        <div className="relative">
          {/* Updated: no shadow + 8px radius (rounded-lg) */}
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

      {loading && (
        <div className="space-y-10" aria-busy="true" aria-live="polite">
          {skeletonRows.map((row) => (
            <section key={row.title} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="h-5 w-40 rounded bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                </div>
                <div className="h-8 w-24 rounded bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {Array.from({ length: LIMIT }).map((_, i) => (
                  <CampCardSkeleton key={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && !error && !hasAny && (
        <p className="text-gray-700 text-sm">
          No activities found yet. Add rows to your “camps” table in Supabase.
        </p>
      )}

      {!loading && !error && hasAny && (
        <div className="space-y-10">
          {rows.map((row) => (
            <section key={row.title} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {row.title}
                </h2>

                {row.seeMore && (
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-sm"
                    onClick={() => navigate(row.seeMore!.to)}
                  >
                    See more
                  </Button>
                )}
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
