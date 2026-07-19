
## Scope

You picked "everything, in sequence" plus 3 called out (ADS-B, Weather/SIGMET, aviation theme) and placeholder trust assets. Realistically that's 13 substantial features + a redesign. I'll ship them in 4 turns so each one is actually solid rather than half-built.

### Turn 1 (this turn) — Live Ops core

1. **Real ADS-B via OpenSky** — TanStack server function `fetchLiveAircraft()` polling `https://opensky-network.org/api/states/all` (free, no auth). Bounding box for Africa + Europe by default. Cached 10s server-side. Merged into `WorldMap.tsx`: gray/dim icons = OpenSky background traffic, colored icons = tenant fleet (matched by `icao24` or `callsign` on `aircraft` table — new nullable column `icao24_hex`). Superadmin sees everything colored per-org.
2. **Weather + SIGMET overlay** — Google Maps Weather connector already linked. Server fn `fetchWeatherTiles` returns tile URL template; render as Leaflet TileLayer with opacity slider. Toggle chips: Clouds / Precip / Turbulence.
3. **Dark aviation theme on tracker** — swap CARTO dark → custom Leaflet CSS: near-black bg (`#0a0e1a`), magenta airways hint (SVG overlay of major FIR boundaries), amber airport dots, VOR-rose marker for major hubs. New `src/routes/_authenticated/tracker.css` with sectional-chart tokens.
4. **Trust & Compliance page** (`/trust`, public) — placeholder cert badges (ISO 27001 in progress, SOC 2 Type I roadmap, KCAA-aligned, GDPR), 2 named launch partners with placeholder logos ("Skyward Aviation Ltd" + "Astral Flight Academy" — clearly swappable), security posture blurb, data residency note.

### Turn 2 — Financial intelligence

5. Fuel-burn heatmap page (`/analytics/fuel`) — kg/seat-km per route, sortable table + heat-colored route lines on mini map.
6. What-if AOG simulator (`/ops/whatif`) — select tail + date, returns swap candidates (available aircraft same type), delay cost estimate, crew legality check via existing `crew_is_clear` fn.
7. NOTAM/TFR overlay on tracker — FAA NOTAM API (free) + manual entry table `notams` (org-scoped).

### Turn 3 — Revenue / stickiness

8. Public passenger status page `/status/$flightNumber` — public route, no auth, live status + ETA.
9. Regulator export packs — PDF bundle generator (KCAA/EASA/FAA templated) via server fn using existing PDF pipeline.
10. Carbon offset marketplace stub — "Buy offsets" CTA on carbon report, links to partner (placeholder Gold Standard), tracks intent in DB for commission reporting.
11. Wet-lease/crew-swap marketplace — new table `marketplace_listings`, tenants post available assets, others browse (cross-org read allowed for this table only).

### Turn 4 — Delight

12. Voice command in SkyChat — Web Speech API mic button → existing chat pipeline.
13. Slack/Teams webhook alerts on AOG — org-level webhook URL in Settings, fires from existing `alerts` insert trigger.
14. Mobile pilot logbook shortcut — PWA manifest + `/pilot` mobile-first route for quick logbook entry.

Apple Watch app is out of scope (needs native Xcode project, not something Lovable can ship).

### Technical details (Turn 1 specifics)

- **DB migration**: `ALTER TABLE aircraft ADD COLUMN icao24_hex text` (nullable, lowercase hex mode-S code). No RLS changes.
- **Server fn**: `src/lib/opensky.functions.ts` — GET, no auth, 10s in-memory cache keyed by bbox. Returns `{ icao24, callsign, lon, lat, alt_m, velocity_ms, heading, on_ground }[]`.
- **WorldMap changes**: two marker layers (background dim + tenant highlighted). Match rule: `aircraft.icao24_hex === state.icao24` OR `aircraft.tail_number === state.callsign?.trim()`.
- **Weather**: server fn `getWeatherTileUrl(layer: 'clouds'|'precip'|'turbulence')` calls Google Maps Weather via connector gateway, returns signed tile template. Cached 5min.
- **Aviation theme**: keeps Leaflet, restyles via CSS class `.tracker--aviation` on map container. FIR/airway lines rendered as SVG `<Polyline>` layers with magenta stroke, low opacity.
- **/trust route**: public SSR route, static content, proper `<head>` OG tags, JSON-LD `Organization` schema for SEO.

### What you'll need to swap later

- OpenSky provides free anonymous access (~10s rate limit, limited history). For >100 aircraft/sec real-time or historical, register free OpenSky account and add `OPENSKY_USER` / `OPENSKY_PASS` secrets — I'll wire the env var but leave it optional.
- Trust page logos + customer names — hardcoded placeholders you overwrite in `src/routes/trust.tsx`.
- FIR/airway overlay uses simplified public-domain data (major boundaries only), not full aeronautical charts (those are licensed).

Ready for me to build Turn 1?
