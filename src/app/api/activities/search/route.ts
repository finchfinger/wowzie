import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyDistanceFilter } from "@/lib/geo";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

const SELECT_COLUMNS = `
  id, program_id, slug, name, description, location,
  lat, lng, session_start, session_end,
  image_url, hero_image_url, image_urls,
  price_cents, status, meta, category, categories,
  featured, listing_type, format, time_of_day,
  series_weeks, schedule_days, start_time, end_time,
  created_at, is_promoted, min_age, max_age
`;

/** Age param format: "3_5" | "6_8" | "9_12" | "13_plus" → [lo, hi] */
const AGE_RANGE_MAP: Record<string, [number, number]> = {
  "3_5":     [3, 5],
  "6_8":     [6, 8],
  "9_12":    [9, 12],
  "13_plus": [13, 99],
};

/**
 * GET /api/activities/search
 *
 * Query params:
 *   q           – keyword search (name, description)
 *   category    – single category slug
 *   tags        – comma-separated category slugs (OR match)
 *   listing_type
 *   series_weeks – integer
 *   days        – comma-separated day keys (mon,tue,…)
 *   time_of_day – morning | afternoon | evening
 *   max_price   – integer dollars (not cents)
 *   age         – 3_5 | 6_8 | 9_12 | 13_plus
 *   date_start  – ISO date (YYYY-MM-DD), session must overlap
 *   date_end    – ISO date (YYYY-MM-DD), session must overlap
 *   lat         – float, centre of distance filter
 *   lng         – float, centre of distance filter
 *   featured    – "true"
 *   program_id  – UUID
 *
 * Response: { results: Activity[], count: number }
 */
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const supabase = getSupabase();

    // Parse params
    const q           = p.get("q")?.trim() || null;
    const category    = p.get("category") || null;
    const tags        = (p.get("tags") || "").split(",").map(s => s.trim()).filter(Boolean);
    const listingType = p.get("listing_type") || null;
    const seriesWeeks = p.get("series_weeks") ? parseInt(p.get("series_weeks")!, 10) : null;
    const days        = (p.get("days") || "").split(",").map(s => s.trim().toLowerCase().slice(0, 3)).filter(Boolean);
    const tod         = p.get("time_of_day") || null;
    const maxPrice    = p.get("max_price") ? parseInt(p.get("max_price")!, 10) : null;
    const age         = p.get("age") || null;
    const dateStart   = p.get("date_start") || null;
    const dateEnd     = p.get("date_end") || null;
    const lat         = p.get("lat") ? parseFloat(p.get("lat")!) : null;
    const lng         = p.get("lng") ? parseFloat(p.get("lng")!) : null;
    const featured    = p.get("featured") === "true";
    const programId   = p.get("program_id") || null;

    // Build query
    let query = supabase
      .from("camps")
      .select(SELECT_COLUMNS)
      .eq("is_published", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (q)            { const like = `%${q}%`; query = query.or(`name.ilike.${like},description.ilike.${like}`); }
    if (programId)    query = query.eq("program_id", programId);
    if (category)     query = query.eq("category", category);
    if (featured)     query = query.eq("featured", true);
    if (listingType)  query = query.eq("listing_type", listingType);
    if (seriesWeeks != null && !isNaN(seriesWeeks)) query = query.eq("series_weeks", seriesWeeks);
    if (days.length)  query = query.contains("schedule_days", days);
    if (tod)          query = query.eq("time_of_day", tod);
    if (tags.length)  query = query.overlaps("categories", tags);
    if (maxPrice != null && !isNaN(maxPrice)) query = query.lte("price_cents", maxPrice * 100);

    // Age filter — DB-side using structured columns
    // Include listings with no age restriction OR whose range overlaps the child's age
    if (age && AGE_RANGE_MAP[age]) {
      const [lo, hi] = AGE_RANGE_MAP[age];
      query = query.or(`min_age.is.null,min_age.lte.${hi}`);
      query = query.or(`max_age.is.null,max_age.gte.${lo}`);
    }

    // Date overlap filter — session must overlap [date_start, date_end]
    if (dateStart) query = query.or(`session_end.is.null,session_end.gte.${dateStart}`);
    if (dateEnd)   query = query.or(`session_start.is.null,session_start.lte.${dateEnd}`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = data ?? [];

    // Distance filter — server-side haversine (can't do in PostgREST without pg extension)
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      const { results: nearby } = applyDistanceFilter(results, lat, lng);
      results = nearby;
    }

    // Boost promoted listings to top
    const promoted = results.filter((r: any) => r.is_promoted === true).slice(0, 3);
    const promotedIds = new Set(promoted.map((r: any) => r.id));
    const organic = results.filter((r: any) => !promotedIds.has(r.id));
    results = [...promoted, ...organic];

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
