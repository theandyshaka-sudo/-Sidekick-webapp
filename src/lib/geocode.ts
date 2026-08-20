const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Turns a zip + city into real coordinates via Mapbox's forward geocoding API, so real distances
// can be computed server-side (discover_services()) instead of the old hardcoded 0. Returns null
// on any failure (no token configured, no network, no match) — callers should treat that as "we
// don't know this location yet" rather than surface an error, since location is optional.
export async function geocodeLocation(zip: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const query = zip.trim() ? `${zip.trim()} ${city.trim()}`.trim() : city.trim();
  if (!MAPBOX_TOKEN || !query) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const [lng, lat] = json?.features?.[0]?.center ?? [];
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { lat, lng };
  } catch (err) {
    console.error("[geocode] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
