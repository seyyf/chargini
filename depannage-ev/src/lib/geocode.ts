/**
 * Best-effort geocoding via Nominatim (OpenStreetMap) — no API key, French
 * results, restricted to Tunisia. All functions return null on any failure:
 * geocoding assists the host form but must never block it.
 *
 * Nominatim usage policy: callers must debounce (≥1s between requests).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ReverseResult {
  city: string;
  address: string;
}

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
}

/** "12 Avenue Habib Bourguiba" from Nominatim address components. */
export function composeStreetAddress(a: NominatimAddress): string {
  const road = a.road ?? a.pedestrian ?? null;
  if (road) {
    return [a.house_number, road].filter(Boolean).join(" ");
  }
  return a.suburb ?? a.neighbourhood ?? "";
}

/** Best available locality name (ville). */
export function cityOf(a: NominatimAddress): string {
  return a.city ?? a.town ?? a.village ?? a.county ?? "";
}

/** Free-text query → coordinates (first Tunisian hit), or null. */
export async function forwardGeocode(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tn&q=${encodeURIComponent(query)}`,
      { headers: { "Accept-Language": "fr" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!json[0]) return null;
    const lat = parseFloat(json[0].lat);
    const lng = parseFloat(json[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Coordinates → { city, address }, or null. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "fr" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: NominatimAddress };
    if (!json.address) return null;
    return {
      city: cityOf(json.address),
      address: composeStreetAddress(json.address),
    };
  } catch {
    return null;
  }
}
