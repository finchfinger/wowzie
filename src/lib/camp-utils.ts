import type { Camp } from "@/components/CampCard";

export type CampRow = Camp & {
  program_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  session_start?: string | null;
  session_end?: string | null;
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

export function dedupeByProgram(items: CampRow[], mode: "soonest" | "newest") {
  const map = new Map<string, CampRow>();
  const now = Date.now();

  for (const item of items) {
    if (!item?.id) continue;
    const key = programKey(item);
    const prev = map.get(key);

    if (!prev) { map.set(key, item); continue; }

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

    if (aUpcoming && !bUpcoming) { map.set(key, item); continue; }
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
