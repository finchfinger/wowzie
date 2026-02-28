"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CampGrid } from "@/components/CampGrid";
import type { Camp } from "@/components/CampCard";

const SELECT_COLUMNS = `
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

const toInt = (v: string | null) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const splitCsv = (v: string | null) => {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const normalizeDay = (d: string) => d.toLowerCase().slice(0, 3);

type CampRow = Camp & {
  program_id?: string | null;
  created_at?: string | null;
  start_time?: string | null;
};

function dedupeByProgram(rows: CampRow[]) {
  const seen = new Set<string>();
  const out: CampRow[] = [];

  for (const r of rows) {
    const pid = r.program_id?.trim();
    if (!pid) {
      out.push(r);
      continue;
    }
    if (seen.has(pid)) continue;
    seen.add(pid);
    out.push(r);
  }

  return out;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
            <p className="text-sm text-muted-foreground">Loading&hellip;</p>
          </div>
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const tags = splitCsv(searchParams.get("tags"));
  const listingType = searchParams.get("type")?.trim() || "";
  const seriesWeeks = toInt(searchParams.get("weeks"));
  const day = searchParams.get("day")?.trim()
    ? normalizeDay(searchParams.get("day")!.trim())
    : "";
  const timeOfDay = searchParams.get("tod")?.trim() || "";
  const format = searchParams.get("format")?.trim() || "";
  const featured =
    searchParams.get("featured") === "1" ||
    searchParams.get("featured") === "true";
  const programId = searchParams.get("program")?.trim() || "";
  const groupMode = searchParams.get("group")?.trim() || "";

  const minDollars = toInt(searchParams.get("min"));
  const maxDollars = toInt(searchParams.get("max"));
  const minCents = minDollars != null ? minDollars * 100 : null;
  const maxCents = maxDollars != null ? maxDollars * 100 : null;

  const [results, setResults] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const depKey = useMemo(
    () =>
      JSON.stringify({
        q,
        category,
        tags,
        listingType,
        seriesWeeks,
        day,
        timeOfDay,
        format,
        featured,
        minCents,
        maxCents,
        programId,
        groupMode,
      }),
    [
      q,
      category,
      tags,
      listingType,
      seriesWeeks,
      day,
      timeOfDay,
      format,
      featured,
      minCents,
      maxCents,
      programId,
      groupMode,
    ],
  );

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("camps")
        .select(SELECT_COLUMNS)
        .eq("is_published", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (q) {
        const like = `%${q}%`;
        query = query.or(`name.ilike.${like},description.ilike.${like}`);
      }

      if (programId) query = query.eq("program_id", programId);
      if (category) query = query.eq("category", category);
      if (featured) query = query.eq("featured", true);
      if (listingType) query = query.eq("listing_type", listingType);
      if (seriesWeeks != null) query = query.eq("series_weeks", seriesWeeks);
      if (day) query = query.contains("schedule_days", [day]);
      if (timeOfDay) query = query.eq("time_of_day", timeOfDay);
      if (format) query = query.eq("format", format);
      if (tags.length > 0) query = query.overlaps("categories", tags);
      if (minCents != null) query = query.gte("price_cents", minCents);
      if (maxCents != null) query = query.lte("price_cents", maxCents);

      const { data, error: dbError } = await query;

      if (dbError) {
        setError("Sorry, we couldn\u2019t load search results.");
        setResults([]);
      } else {
        const rows = (data || []) as CampRow[];
        setResults(groupMode === "program" ? dedupeByProgram(rows) : rows);
      }

      setLoading(false);
    };

    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  const headingText = q
    ? `Showing results for \u201c${q}\u201d`
    : "Showing all activities";

  return (
    <main className="flex-1">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Search
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {headingText}
          </h1>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
          )}
        </header>

        {loading && (
          <p className="text-sm text-muted-foreground">
            Loading activities\u2026
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-xl p-6 text-sm text-muted-foreground">
            <p className="font-medium mb-1">No matching activities yet.</p>
            <p>
              Try a different search term, or clear filters and browse featured
              activities.
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <section>
            <CampGrid camps={results as unknown as Camp[]} />
          </section>
        )}
      </div>
    </main>
  );
}
