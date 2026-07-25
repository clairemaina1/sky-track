import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, Polyline, LayerGroup, SVGOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./tracker-aviation.css";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchLiveAircraft, type LiveAircraft } from "@/lib/opensky.functions";
import { getWeatherTileUrl } from "@/lib/weather.functions";
import { FIR_LINES, VOR_HUBS } from "./aviation-fir";
import { NOTAMS, NOTAM_COLOR } from "./notams";

// FR24-style plane silhouette (nose-up); rotated by heading via CSS transform.
function planeSvg(color: string, stroke = "#000"): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2 L14 10 L22 12 L22 14 L14 13 L13 20 L15 21 L15 22 L12 21 L9 22 L9 21 L11 20 L10 13 L2 14 L2 12 L10 10 Z"
      fill="${color}" stroke="${stroke}" stroke-width="0.6" stroke-linejoin="round"/>
  </svg>`;
}

function planeDivIcon(color: string, heading: number, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: `plane-icon${selected ? " selected" : ""}`,
    html: `<div style="transform: rotate(${heading}deg);">${planeSvg(color)}</div>`,
    iconSize: selected ? [30, 30] : [22, 22],
    iconAnchor: selected ? [15, 15] : [11, 11],
  });
}


const AIRPORT_COORDS: Record<string, [number, number]> = {
  HKJK: [-1.319, 36.927], HKWL: [-1.323, 36.806], HKNW: [-1.322, 36.815],
  HTDA: [-6.878, 39.202], HAAB: [8.978, 38.799], FYYY: [-22.48, 17.47],
  FAOR: [-26.139, 28.246], DNMM: [6.577, 3.321], DIAP: [5.254, -3.927],
  EGLL: [51.477, -0.461], LFPG: [49.009, 2.548], OMDB: [25.253, 55.365],
  RJTT: [35.549, 139.78], KLAX: [33.942, -118.408], KJFK: [40.64, -73.779],
  YSSY: [-33.946, 151.177], HRYR: [-1.9686, 30.1395], HUEN: [0.0424, 32.4435],
  HSSS: [15.5895, 32.5532], FZAA: [-4.3858, 15.4446],
};

export type WMFlight = {
  id: string;
  flight_number: string;
  origin_icao: string;
  destination_icao: string;
  status: string;
  progress_pct: number | null;
  org_id: string;
  aircraft: { id: string; tail_number: string; icao24_hex?: string | null } | null;
  organizations: { name: string } | null;
};

function orgColor(orgId: string): string {
  let h = 2166136261;
  for (let i = 0; i < orgId.length; i++) {
    h ^= orgId.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const hue = Math.round(((h % 1000) / 1000) * 360 * 0.61803398875) % 360;
  return `hsl(${hue} 82% 60%)`;
}

function interp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function VorRose({ pos, name }: { pos: [number, number]; name: string }) {
  // A tiny SVG compass rose overlaid at the hub airport.
  const d = 1.2; // degrees box half-size
  const bounds: L.LatLngBoundsExpression = [
    [pos[0] - d, pos[1] - d],
    [pos[0] + d, pos[1] + d],
  ];
  return (
    <SVGOverlay bounds={bounds} interactive={false} attributes={{ class: "vor-rose" }}>
      <circle cx="50" cy="50" r="34" className="rose-ring" />
      <circle cx="50" cy="50" r="24" className="rose-ring" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 24;
        const y1 = 50 + Math.sin(a) * 24;
        const x2 = 50 + Math.cos(a) * 34;
        const y2 = 50 + Math.sin(a) * 34;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="rose-tick" />;
      })}
      <text x="50" y="46" textAnchor="middle" className="rose-label">{name}</text>
    </SVGOverlay>
  );
}

export default function WorldMap({
  flights,
  selectedFlightId,
  onSelect,
}: {
  flights: WMFlight[];
  selectedFlightId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showAdsb, setShowAdsb] = useState(true);
  const [showFir, setShowFir] = useState(false);
  const [showNotams, setShowNotams] = useState(true);
  const [basemap, setBasemap] = useState<"map" | "satellite">("map");

  const fetchAdsb = useServerFn(fetchLiveAircraft);
  const fetchWx = useServerFn(getWeatherTileUrl);


  const { data: adsb = [] } = useQuery({
    queryKey: ["live-adsb"],
    queryFn: () => fetchAdsb(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data: weather } = useQuery({
    queryKey: ["weather-tiles"],
    queryFn: () => fetchWx(),
    refetchInterval: 5 * 60_000,
    enabled: showWeather,
  });

  const routes = useMemo(() => {
    return flights
      .map((f) => {
        const o = AIRPORT_COORDS[f.origin_icao];
        const d = AIRPORT_COORDS[f.destination_icao];
        if (!o || !d) return null;
        const t = Math.min(1, Math.max(0, (f.progress_pct ?? 20) / 100));
        return { f, o, d, pos: interp(o, d, t), color: orgColor(f.org_id) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [flights]);

  // Build a tenant-fleet lookup by icao24 and callsign for the live-position overlay.
  const tenantByIcao = useMemo(() => {
    const m = new Map<string, WMFlight>();
    for (const f of flights) {
      const hex = f.aircraft?.icao24_hex?.toLowerCase().trim();
      if (hex) m.set(hex, f);
    }
    return m;
  }, [flights]);
  const tenantByCallsign = useMemo(() => {
    const m = new Map<string, WMFlight>();
    for (const f of flights) {
      const cs = f.flight_number?.replace(/\s+/g, "").toUpperCase();
      if (cs) m.set(cs, f);
    }
    return m;
  }, [flights]);

  const { backgroundTraffic, tenantLive } = useMemo(() => {
    const bg: LiveAircraft[] = [];
    const own: { ac: LiveAircraft; f: WMFlight }[] = [];
    for (const a of adsb) {
      const hit = tenantByIcao.get(a.icao24) ||
        (a.callsign ? tenantByCallsign.get(a.callsign.replace(/\s+/g, "").toUpperCase()) : undefined);
      if (hit) own.push({ ac: a, f: hit });
      else bg.push(a);
    }
    return { backgroundTraffic: bg, tenantLive: own };
  }, [adsb, tenantByIcao, tenantByCallsign]);

  const airports = useMemo(() => {
    const s = new Map<string, [number, number]>();
    for (const r of routes) {
      s.set(r.f.origin_icao, r.o);
      s.set(r.f.destination_icao, r.d);
    }
    return Array.from(s.entries());
  }, [routes]);

  useEffect(() => {
    if (!mapRef.current || !selectedFlightId) return;
    const r = routes.find((x) => x.f.id === selectedFlightId);
    if (r) mapRef.current.flyTo(r.pos, 5, { duration: 0.8 });
  }, [selectedFlightId, routes]);

  return (
    <div
      className="tracker--aviation relative w-full overflow-hidden rounded-2xl"
      style={{ height: 560, border: "1px solid rgba(37,99,235,0.25)" }}
    >
      <MapContainer
        ref={mapRef as never}
        center={[5, 25]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        {basemap === "map" ? (
          <TileLayer
            key="osm"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors &middot; ADS-B: OpenSky &middot; Radar: RainViewer'
          />
        ) : (
          <>
            <TileLayer
              key="sat"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &middot; ADS-B: OpenSky'
            />
            <TileLayer
              key="sat-labels"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
              subdomains={["a", "b", "c", "d"]}
              attribution=""
            />
          </>
        )}

        {showWeather && weather?.precip && (
          <TileLayer
            url={weather.precip}
            opacity={0.55}
            zIndex={200}
            attribution=""
          />
        )}


        {showFir && (
          <LayerGroup>
            {FIR_LINES.map((line, i) => (
              <Polyline
                key={`fir-${i}`}
                positions={line}
                pathOptions={{ color: "#d946ef", weight: 0.7, opacity: 0.35, dashArray: "2 6" }}
              />
            ))}
            {VOR_HUBS.map((v) => (
              <VorRose key={v.id} pos={v.pos} name={v.name} />
            ))}
          </LayerGroup>
        )}

        {/* NOTAMs / airspace advisories */}
        {showNotams && NOTAMS.map((n) => {
          const color = NOTAM_COLOR[n.severity];
          return (
            <CircleMarker
              key={`notam-${n.id}`}
              center={[n.lat, n.lon]}
              radius={Math.max(6, Math.min(18, n.radiusNm / 2))}
              pathOptions={{
                color, fillColor: color, fillOpacity: 0.12,
                weight: 1.4, dashArray: n.severity === "warning" ? undefined : "3 4",
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-[10px] font-mono max-w-[220px]">
                  <div className="font-bold" style={{ color }}>{n.id} · {n.icao} · {n.severity.toUpperCase()}</div>
                  <div className="text-slate-500 uppercase tracking-wider text-[9px]">{n.category} · {n.radiusNm}NM · valid to {new Date(n.expires).toUTCString().slice(5, 22)}Z</div>
                  <div className="mt-1 text-slate-300 whitespace-normal">{n.summary}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Scheduled/known routes */}
        {routes.map((r) => (
          <Polyline
            key={`ln-${r.f.id}`}
            positions={[r.o, r.d]}
            pathOptions={{
              color: r.color,
              weight: selectedFlightId === r.f.id ? 2.2 : 1,
              opacity: selectedFlightId === r.f.id ? 0.9 : 0.4,
              dashArray: selectedFlightId === r.f.id ? undefined : "4 6",
            }}
          />
        ))}
        {airports.map(([icao, pos]) => (
          <CircleMarker
            key={icao}
            center={pos}
            radius={3}
            pathOptions={{ color: "#fbbf24", fillColor: "#fde68a", fillOpacity: 0.9, weight: 1 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>{icao}</Tooltip>
          </CircleMarker>
        ))}

        {/* Background ADS-B traffic — small yellow FR24-style plane silhouettes */}
        {showAdsb && backgroundTraffic.map((a) => (
          <Marker
            key={`bg-${a.icao24}`}
            position={[a.lat, a.lon]}
            icon={planeDivIcon("#f7c948", a.heading ?? 0, false)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="plane-label">
              {a.callsign?.trim() || a.icao24.toUpperCase()}
            </Tooltip>
          </Marker>
        ))}

        {/* Tenant fleet live positions — colored per org */}
        {showAdsb && tenantLive.map(({ ac, f }) => {
          const color = orgColor(f.org_id);
          const sel = selectedFlightId === f.id;
          const label = f.aircraft?.tail_number ?? f.flight_number ?? ac.callsign?.trim() ?? ac.icao24.toUpperCase();
          return (
            <Marker
              key={`live-${ac.icao24}`}
              position={[ac.lat, ac.lon]}
              icon={planeDivIcon(color, ac.heading ?? 0, sel)}
              eventHandlers={{ click: () => onSelect(sel ? null : f.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, sel ? -14 : -10]}
                opacity={1}
                permanent={sel}
                className="plane-label"
              >
                {label}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Scheduled-position fallback (for flights without live ADS-B match) */}
        {routes.filter(r => !tenantLive.some(t => t.f.id === r.f.id)).map((r) => {
          const sel = selectedFlightId === r.f.id;
          // derive heading from origin→destination bearing (simple)
          const dy = r.d[0] - r.o[0];
          const dx = r.d[1] - r.o[1];
          const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
          const label = r.f.aircraft?.tail_number ?? r.f.flight_number;
          return (
            <Marker
              key={`ac-${r.f.id}`}
              position={r.pos}
              icon={planeDivIcon(r.color, bearing, sel)}
              eventHandlers={{ click: () => onSelect(sel ? null : r.f.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, sel ? -14 : -10]}
                opacity={1}
                permanent={sel}
                className="plane-label"
              >
                {label}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Layer controls */}
      <div className="pointer-events-auto absolute left-3 top-3 z-[400] flex flex-wrap gap-1.5">
        <button className="weather-toggle-chip" data-active={basemap === "satellite"} onClick={() => setBasemap(b => b === "map" ? "satellite" : "map")}>
          {basemap === "satellite" ? "Satellite" : "Map"}
        </button>
        <button className="weather-toggle-chip" data-active={showAdsb} onClick={() => setShowAdsb(v => !v)}>
          ADS-B {adsb.length > 0 && `· ${adsb.length}`}
        </button>
        <button className="weather-toggle-chip" data-active={showWeather} onClick={() => setShowWeather(v => !v)}>
          Radar
        </button>
        <button className="weather-toggle-chip" data-active={showFir} onClick={() => setShowFir(v => !v)}>
          FIR / VOR
        </button>
        <button className="weather-toggle-chip" data-active={showNotams} onClick={() => setShowNotams(v => !v)}>
          NOTAM {NOTAMS.length > 0 && `· ${NOTAMS.length}`}
        </button>
      </div>


      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: "rgba(217,70,239,0.12)", border: "1px solid rgba(217,70,239,0.3)" }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
        </span>
        <span className="text-[9px] font-semibold text-fuchsia-300 font-mono">LIVE · ADS-B</span>
      </div>

      {tenantLive.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-md px-2 py-1 font-mono text-[10px] text-emerald-300"
          style={{ background: "rgba(5,7,13,0.75)", border: "1px solid rgba(52,211,153,0.3)" }}>
          {tenantLive.length} of your aircraft tracked live
        </div>
      )}
    </div>
  );
}
