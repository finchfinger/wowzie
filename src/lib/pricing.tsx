// src/lib/pricing.ts
export type PriceUnit = "per session" | "per class" | "per week" | "per day";

/**
 * UI-facing pricing unit.
 * Never returns "program".
 *
 * Heuristic:
 * - If meta.price_unit is set and valid, use it.
 * - If listing_type === "class", use per class.
 * - If listing_type === "series", default to per week (parents understand this).
 * - If schedule_days has 2+ days, treat as per week.
 * - Else default per session.
 *
 * You can refine this later (per day) once you store that explicitly.
 */
export function getPriceUnit(camp: {
  listing_type?: string | null;
  schedule_days?: string[] | null;
  meta?: any | null;
}): PriceUnit {
  const raw = camp?.meta?.price_unit;

  if (
    raw === "per session" ||
    raw === "per class" ||
    raw === "per week" ||
    raw === "per day"
  ) {
    return raw;
  }

  const lt = (camp.listing_type || "").trim();

  if (lt === "class") return "per class";
  if (lt === "series") return "per week";

  const days = Array.isArray(camp.schedule_days) ? camp.schedule_days : null;
  if (days && days.length >= 2) return "per week";

  return "per session";
}
