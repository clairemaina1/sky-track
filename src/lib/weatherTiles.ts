// Weather tile providers — all free, no auth required.
// RainViewer: precipitation radar (past ~2h + short forecast)
// OpenWeatherMap free public tile mirror is NOT reliable without key;
// we surface only providers that work anonymously.

export type WeatherLayer = "precip" | "clouds" | "sigmet";

// RainViewer publishes an index of available radar frames.
// https://www.rainviewer.com/api.html
export async function getRainviewerLatestTileUrl(): Promise<string | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      host: string;
      radar: { past: { path: string; time: number }[] };
    };
    const latest = json.radar?.past?.[json.radar.past.length - 1];
    if (!latest) return null;
    // Tile template — {size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
    return `${json.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch {
    return null;
  }
}
