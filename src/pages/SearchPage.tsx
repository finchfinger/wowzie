// src/pages/SearchPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CampGrid } from "../components/CampGrid";
import type { Camp } from "../components/CampCard";

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

const normalizeDay = (d: string) => d.toLowerCase().slice(0, 3); // "wednesday" -> "wed"

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
    // If no program_id, treat the listing as unique
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

const SearchPage: React.FC = () => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const q = params.get("q")?.trim() || "";

  const category = params.get("category")?.trim() || "";
  const tags = splitCsv(params.get("tags"));
  const listingType = params.get("type")?.trim() || ""; // camp | series | ongoing
  const seriesWeeks = toInt(params.get("weeks")); // 4 | 8 | 10 | 12
  const day = params.get("day")?.trim() ? normalizeDay(params.get("day")!.trim()) : "";
  const timeOfDay = params.get("tod")?.trim() || ""; // morning | afternoon | full-day
  const format = params.get("format")?.trim() || ""; // in-person | virtual
  const featured = params.get("featured") === "1" || params.get("featured") === "true";

  // New: program filter and optional grouping
  const programId = params.get("program")?.trim() || ""; // e.g. violin-basics
  const groupMode = params.get("group")?.trim() || ""; // "program" to dedupe

  // price in dollars in URL, store cents in DB
  const minDollars = toInt(params.get("min"));
  const maxDollars = toInt(params.get("max"));
  const minCents = minDollars != null ? minDollars * 100 : null;
  const maxCents = maxDollars != null ? maxDollars * 100 : null;

  const [results, setResults] = useState<CampRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

      // Text search
      if (q) {
        const like = `%${q}%`;
        query = query.or(`name.ilike.${like},description.ilike.${like}`);
      }

      // Program filter
      if (programId) {
        query = query.eq("program_id", programId);
      }

      // Category
      if (category) {
        query = query.eq("category", category);
      }

      // Featured
      if (featured) {
        query = query.eq("featured", true);
      }

      // Listing type: camp | series | ongoing
      if (listingType) {
        query = query.eq("listing_type", listingType);
      }

      // Series weeks: 4 | 8 | 10 | 12
      if (seriesWeeks != null) {
        query = query.eq("series_weeks", seriesWeeks);
      }

      // Day of week for series/ongoing (v1 one-day array)
      if (day) {
        query = query.contains("schedule_days", [day]);
      }

      // Time of day filter
      if (timeOfDay) {
        query = query.eq("time_of_day", timeOfDay);
      }

      // Format filter
      if (format) {
        query = query.eq("format", format);
      }

      // Tags filter
      if (tags.length > 0) {
        query = query.overlaps("categories", tags);
      }

      // Price range
      if (minCents != null) {
        query = query.gte("price_cents", minCents);
      }
      if (maxCents != null) {
        query = query.lte("price_cents", maxCents);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error (search):", error);
        setError("Sorry, we couldn’t load search results.");
        setResults([]);
      } else {
        const rows = (data || []) as CampRow[];
        setResults(groupMode === "program" ? dedupeByProgram(rows) : rows);
      }

      setLoading(false);
    };

    void loadResults();
  }, [
    q,
    category,
    tags.join(","),
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
  ]);

  const headingText = q ? `Showing results for “${q}”` : "Showing all activities";

  return (
    <main className="flex-1 bg-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Search
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {headingText}
          </h1>
          {!loading && !error && (
            <p className="text-xs text-gray-500">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
          )}
        </header>

        {loading && <p className="text-sm text-gray-500">Loading activities…</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-600">
            <p className="font-medium mb-1">No matching activities yet.</p>
            <p className="text-gray-500">
              Try a different search term, or clear filters and browse featured activities.
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
};

export default SearchPage;
export { SearchPage };
