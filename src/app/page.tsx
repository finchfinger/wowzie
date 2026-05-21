import { createClient } from "@supabase/supabase-js";
import { HomePageClient } from "./HomePageClient";
import { dedupeByProgram, type CampRow } from "@/lib/camp-utils";

export const revalidate = 60;

const CAMP_CARD_COLUMNS = `
  id, program_id, slug, short_id, name, location,
  image_url, price_cents, category, categories,
  listing_type, schedule_days, start_time, end_time,
  session_start, session_end, created_at, featured,
  meta, hero_image_url, image_urls
`;

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await supabase
    .from("camps")
    .select(CAMP_CARD_COLUMNS)
    .eq("is_published", true)
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  const pool = dedupeByProgram((data ?? []) as CampRow[], "newest");

  return <HomePageClient initialPool={pool} />;
}
