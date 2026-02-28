export type PriceUnit = "per session" | "per class" | "per week" | "per day";

export function getPriceUnit(camp: {
  listing_type?: string | null;
  schedule_days?: string[] | null;
  meta?: Record<string, unknown> | null;
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
