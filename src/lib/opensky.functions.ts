import { createServerFn } from "@tanstack/react-start";

export type LiveAircraft = {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  lon: number;
  lat: number;
  alt_m: number | null;
  velocity_ms: number | null;
  heading: number | null;
  on_ground: boolean;
};

// Simple in-memory cache — OpenSky anon rate limit is ~10s between requests.
let cache: { at: number; data: LiveAircraft[] } | null = null;
const CACHE_MS = 12_000;

// Default bounding box: covers Africa, Europe, Middle East.
// OpenSky states/all fields: https://openskynetwork.github.io/opensky-api/rest.html
// [0]icao24, [1]callsign, [2]origin_country, [5]longitude, [6]latitude,
// [7]baro_altitude, [8]on_ground, [9]velocity, [10]heading, [13]geo_altitude
export const fetchLiveAircraft = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const params = new URLSearchParams({
    lamin: "-40",
    lamax: "60",
    lomin: "-25",
    lomax: "60",
  });

  try {
    const headers: Record<string, string> = { "User-Agent": "SkyTrack-AAOS/1.0" };
    const user = process.env.OPENSKY_USER;
    const pass = process.env.OPENSKY_PASS;
    if (user && pass) {
      headers.Authorization = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    }

    const res = await fetch(`https://opensky-network.org/api/states/all?${params}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Rate-limited or upstream problem — reuse stale cache if present, else empty.
      return cache?.data ?? [];
    }
    const json = (await res.json()) as { states?: unknown[][] | null };
    const states = json.states ?? [];
    const data: LiveAircraft[] = [];
    for (const s of states) {
      const lon = s[5] as number | null;
      const lat = s[6] as number | null;
      if (lon == null || lat == null) continue;
      const icao = (s[0] as string | null)?.toLowerCase().trim();
      if (!icao) continue;
      data.push({
        icao24: icao,
        callsign: ((s[1] as string | null) ?? "").trim() || null,
        origin_country: (s[2] as string | null) ?? "",
        lon,
        lat,
        alt_m: (s[13] as number | null) ?? (s[7] as number | null),
        velocity_ms: s[9] as number | null,
        heading: s[10] as number | null,
        on_ground: (s[8] as boolean | null) ?? false,
      });
    }
    // Cap at 800 to keep client light.
    const trimmed = data.slice(0, 800);
    cache = { at: Date.now(), data: trimmed };
    return trimmed;
  } catch {
    return cache?.data ?? [];
  }
});
