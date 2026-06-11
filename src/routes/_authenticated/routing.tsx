import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AIRPORTS } from "@/lib/types";
import type { Aircraft, Flight } from "@/lib/types";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from "react-leaflet";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/routing")({
  head: pageHead({ title: "Routing — SkyTrack AAOS", description: "AI-optimised flight routing, fuel burn, and ETOPS-aware path planning.", path: "/routing" }), component: RoutingPage });

function RoutingPage() {
  const { data: flights = [] } = useQuery({
    queryKey: ["flights"],
    queryFn: async () => (await supabase.from("flights").select("*")).data as Flight[],
  });
  const { data: fleet = [] } = useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });

  const [origin, setOrigin] = useState("HKJK");
  const [dest, setDest] = useState("HAAB");
  const [payload, setPayload] = useState(15000);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const o = AIRPORTS[origin], d = AIRPORTS[dest];
  const dist = o && d ? Math.round(haversine(o.lat, o.lon, d.lat, d.lon)) : 0;
  const baseFuel = Math.round(dist * 3.5);
  const wind = Math.round(baseFuel * 0.08);
  const reserve = Math.round(baseFuel * 0.05) + 1000;
  const total = Math.round((baseFuel + wind + reserve) * 1.03);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 h-[calc(100vh-160px)]">
      <div className="panel overflow-hidden">
        <MapContainer center={[-2, 35]} zoom={5} style={{ height: "100%", background: "var(--bg-void)" }}>
          <TileLayer url="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" attribution="&copy; CartoDB" />
          {Object.entries(AIRPORTS).map(([icao, a]) => (
            <CircleMarker key={icao} center={[a.lat, a.lon]} radius={6} pathOptions={{ color: "#0EA5E9", fillColor: "#0EA5E9", fillOpacity: 0.7 }}>
              <Popup><div className="font-mono text-xs"><b>{icao}</b><br/>{a.name}<br/>{a.city}</div></Popup>
            </CircleMarker>
          ))}
          {flights.map((f) => {
            const a = AIRPORTS[f.origin_icao], b = AIRPORTS[f.destination_icao];
            if (!a || !b) return null;
            return (
              <Polyline key={f.id} positions={[[a.lat, a.lon], [b.lat, b.lon]]}
                pathOptions={{ color: "#0EA5E9", weight: 1.5, dashArray: "8 6", opacity: 0.7 }} />
            );
          })}
          {flights.map((f) => {
            const a = AIRPORTS[f.origin_icao], b = AIRPORTS[f.destination_icao];
            if (!a || !b || !f.scheduled_departure || !f.scheduled_arrival) return null;
            const dep = new Date(f.scheduled_departure).getTime();
            const arr = new Date(f.scheduled_arrival).getTime();
            const now = Date.now() + tick * 0; // tick triggers re-render
            const p = (now - dep) / (arr - dep);
            if (p <= 0 || p >= 1) return null;
            const lat = a.lat + (b.lat - a.lat) * p;
            const lon = a.lon + (b.lon - a.lon) * p;
            const color = f.status === "Delayed" ? "#F59E0B" : f.status === "Cancelled" ? "#EF4444" : "#22C55E";
            return (
              <CircleMarker key={`pos-${f.id}`} center={[lat, lon]} radius={5}
                pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}>
                <Popup>
                  <div className="font-mono text-xs">
                    <b>{f.flight_number}</b><br />
                    {f.origin_icao} → {f.destination_icao}<br />
                    {(p * 100).toFixed(0)}% en route
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          {fleet.filter((a) => a.status === "AOG").map((ac) => {
            const ap = AIRPORTS[ac.current_airport ?? ac.base_airport];
            if (!ap) return null;
            const pulse = 0.4 + 0.3 * Math.sin(tick * 0.8);
            return <CircleMarker key={ac.id} center={[ap.lat, ap.lon]} radius={10 + pulse * 4}
              pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: pulse, weight: 2 }}>
              <Popup>AOG: {ac.tail_number}</Popup></CircleMarker>;
          })}
        </MapContainer>
      </div>

      <div className="panel p-4 space-y-3 overflow-auto">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg">Fuel Simulator</div>
        <Select label="Origin" value={origin} onChange={setOrigin} />
        <Select label="Destination" value={dest} onChange={setDest} />
        <div>
          <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">Payload (kg)</label>
          <input type="number" value={payload} onChange={(e) => setPayload(Number(e.target.value))}
            className="w-full mt-1 px-3 py-1.5 bg-surface border font-mono text-sm" style={{ borderColor: "var(--border-subtle)" }} />
        </div>
        <div className="panel-elevated p-3 text-sm">
          <Row label="Distance" value={`${dist} km`} />
          <Row label="Base fuel" value={`${baseFuel.toLocaleString()} kg`} />
          <Row label="Wind correction" value={`+${wind.toLocaleString()} kg`} />
          <Row label="Reserve + alternate" value={`${reserve.toLocaleString()} kg`} />
          <Row label="Contingency 3%" value="" />
          <div className="border-t mt-2 pt-2 flex justify-between font-mono" style={{ borderColor: "var(--border-subtle)" }}>
            <span>TOTAL</span>
            <span className="text-accent">{total.toLocaleString()} kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function Select({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-1.5 bg-surface border font-mono text-sm" style={{ borderColor: "var(--border-subtle)" }}>
        {Object.entries(AIRPORTS).map(([k, v]) => <option key={k} value={k}>{k} · {v.city}</option>)}
      </select>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-xs"><span className="text-secondary-fg">{label}</span><span className="font-mono">{value}</span></div>;
}
