import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  aircraft: { id: string; tail_number: string } | null;
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
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: 520, border: "1px solid rgba(52,211,153,0.15)" }}
    >
      <MapContainer
        ref={mapRef as never}
        center={[5, 25]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        style={{ height: "100%", width: "100%", background: "#0a1628" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
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
            pathOptions={{ color: "#94a3b8", fillColor: "#e2e8f0", fillOpacity: 0.9, weight: 1 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
              {icao}
            </Tooltip>
          </CircleMarker>
        ))}
        {routes.map((r) => {
          const sel = selectedFlightId === r.f.id;
          return (
            <CircleMarker
              key={`ac-${r.f.id}`}
              center={r.pos}
              radius={sel ? 8 : 5}
              pathOptions={{
                color: r.color,
                fillColor: r.color,
                fillOpacity: 0.95,
                weight: sel ? 2 : 1,
              }}
              eventHandlers={{ click: () => onSelect(sel ? null : r.f.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]} permanent={sel} opacity={1}>
                <div className="text-[10px] font-mono">
                  <div className="font-bold">{r.f.aircraft?.tail_number ?? r.f.flight_number}</div>
                  <div className="text-slate-500">{r.f.origin_icao} → {r.f.destination_icao}</div>
                  {r.f.organizations?.name && <div className="text-slate-400">{r.f.organizations.name}</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[9px] font-semibold text-emerald-400 font-mono">LIVE</span>
      </div>
    </div>
  );
}
