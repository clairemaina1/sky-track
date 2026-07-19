import { createServerFn } from "@tanstack/react-start";
import { getRainviewerLatestTileUrl } from "./weatherTiles";

let cache: { at: number; url: string | null } | null = null;

export const getWeatherTileUrl = createServerFn({ method: "GET" }).handler(async () => {
  // Cache 5 minutes — RainViewer publishes new frames every ~10 min.
  if (cache && Date.now() - cache.at < 5 * 60_000) return { precip: cache.url };
  const url = await getRainviewerLatestTileUrl();
  cache = { at: Date.now(), url };
  return { precip: url };
});
