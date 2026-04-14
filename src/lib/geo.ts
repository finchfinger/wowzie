/**
 * Haversine distance between two lat/lng points, in miles.
 */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Radii to try (miles), in expanding order. */
export const SEARCH_RADII = [10, 25, 50] as const;

/** Minimum results before we expand the radius. */
export const RADIUS_MIN_RESULTS = 5;

export type WithCoords = { lat?: number | null; lng?: number | null };

/**
 * Filter a list of items by distance from a centre point, using an
 * auto-expanding radius.  Items without coordinates are always included.
 * Returns the filtered list and the radius that was applied (null = no filter).
 */
export function applyDistanceFilter<T extends WithCoords>(
  items: T[],
  centerLat: number,
  centerLng: number,
): { results: T[]; radiusMiles: number | null } {
  const withCoords = items.filter((c) => c.lat != null && c.lng != null);
  const noCoords = items.filter((c) => c.lat == null || c.lng == null);

  for (const r of SEARCH_RADII) {
    const nearby = withCoords.filter(
      (c) => haversineMiles(centerLat, centerLng, c.lat!, c.lng!) <= r,
    );
    if (nearby.length >= RADIUS_MIN_RESULTS) {
      return { results: [...nearby, ...noCoords], radiusMiles: r };
    }
  }

  // Nothing within any radius — return everything
  return { results: items, radiusMiles: null };
}
