import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FlightRow,
  type FlightRowData,
  type FlightStatus,
} from "@/components/flights/FlightRow";
import { LiveMap } from "@/components/flights/LiveMap";
import type { PlatformTier } from "@/lib/tierGuard";
import { useResolvedTier } from "@/hooks/use-org";

export const Route = createFileRoute("/_authenticated/flights")({
  head: pageHead({ title: "Flights — SkyTrack AAOS", description: "Live flight board with AI delay predictions, route tracking, and ICAO carbon emissions per sector.", path: "/flights" }), component: FlightsPage });

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60000).toISOString();

const FLIGHT_SCHOOL_FLIGHTS: FlightRowData[] = [
  { id: "trn-001", flight_number: "ST-TRN01", origin_icao: "HKWL", origin_iata: "WIL", origin_city: "Nairobi Wilson", destination_icao: "HKWL", destination_iata: "WIL", destination_city: "Nairobi Wilson", aircraft_tail: "5Y-CKA", aircraft_model: "Cessna 172S", status: "En_Route", scheduled_departure: minutesFromNow(-65), scheduled_arrival: minutesFromNow(25), actual_departure: minutesFromNow(-65), actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.93, distance_nm: 48, pax_count: 2, co2_kg_planned: 22, progress_pct: 72 },
  { id: "trn-002", flight_number: "ST-TRN02", origin_icao: "HKWL", origin_iata: "WIL", origin_city: "Nairobi Wilson", destination_icao: "HKJK", destination_iata: "NBO", destination_city: "Jomo Kenyatta", aircraft_tail: "5Y-PKB", aircraft_model: "Piper PA-28-181", status: "Departed", scheduled_departure: minutesFromNow(-30), scheduled_arrival: hoursFromNow(0.5), actual_departure: minutesFromNow(-30), actual_arrival: null, delay_minutes: 0, predicted_delay_min: 8, delay_prediction_conf: 0.71, distance_nm: 14, pax_count: 2, co2_kg_planned: 11, progress_pct: 55 },
  { id: "trn-003", flight_number: "ST-TRN03", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Jomo Kenyatta", destination_icao: "HKWL", destination_iata: "WIL", destination_city: "Nairobi Wilson", aircraft_tail: "5Y-CKB", aircraft_model: "Cessna 172R", status: "Scheduled", scheduled_departure: hoursFromNow(1), scheduled_arrival: hoursFromNow(1.5), actual_departure: null, actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.88, distance_nm: 14, pax_count: 2, co2_kg_planned: 10, progress_pct: null },
  { id: "trn-004", flight_number: "ST-TRN04", origin_icao: "HKWL", origin_iata: "WIL", origin_city: "Nairobi Wilson", destination_icao: "HKWL", destination_iata: "WIL", destination_city: "Nairobi Wilson", aircraft_tail: "5Y-CKC", aircraft_model: "Cessna 172S", status: "Delayed", scheduled_departure: minutesFromNow(-20), scheduled_arrival: hoursFromNow(0.75), actual_departure: null, actual_arrival: null, delay_minutes: 35, predicted_delay_min: 40, delay_prediction_conf: 0.82, distance_nm: 52, pax_count: 2, co2_kg_planned: 24, progress_pct: null },
  { id: "trn-005", flight_number: "ST-TRN05", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Jomo Kenyatta", destination_icao: "HKWL", destination_iata: "WIL", destination_city: "Nairobi Wilson", aircraft_tail: "5Y-PKA", aircraft_model: "Piper PA-28-161", status: "Landed", scheduled_departure: hoursFromNow(-3), scheduled_arrival: hoursFromNow(-2.5), actual_departure: hoursFromNow(-3), actual_arrival: hoursFromNow(-2.48), delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.97, distance_nm: 14, pax_count: 2, co2_kg_planned: 10, progress_pct: 100 },
];

const COMMERCIAL_FLIGHTS: FlightRowData[] = [
  { id: "com-001", flight_number: "ST-101", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Nairobi", destination_icao: "EGLL", destination_iata: "LHR", destination_city: "London", aircraft_tail: "5Y-SKA", aircraft_model: "A320neo", status: "En_Route", scheduled_departure: hoursFromNow(-4.5), scheduled_arrival: hoursFromNow(4.5), actual_departure: hoursFromNow(-4.5), actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.96, distance_nm: 4224, pax_count: 162, co2_kg_planned: 41800, progress_pct: 50 },
  { id: "com-002", flight_number: "ST-088", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Nairobi", destination_icao: "OMDB", destination_iata: "DXB", destination_city: "Dubai", aircraft_tail: "5Y-SKF", aircraft_model: "787-9 Dreamliner", status: "En_Route", scheduled_departure: hoursFromNow(-3), scheduled_arrival: hoursFromNow(2), actual_departure: hoursFromNow(-3), actual_arrival: null, delay_minutes: 0, predicted_delay_min: 12, delay_prediction_conf: 0.68, distance_nm: 2094, pax_count: 294, co2_kg_planned: 53200, progress_pct: 61 },
  { id: "com-003", flight_number: "ST-204", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Nairobi", destination_icao: "HAAB", destination_iata: "ADD", destination_city: "Addis Ababa", aircraft_tail: "5Y-SKC", aircraft_model: "A321neo", status: "Approach", scheduled_departure: hoursFromNow(-2.2), scheduled_arrival: minutesFromNow(15), actual_departure: hoursFromNow(-2.2), actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.99, distance_nm: 741, pax_count: 189, co2_kg_planned: 19400, progress_pct: 94 },
  { id: "com-004", flight_number: "ST-312", origin_icao: "HKJK", origin_iata: "NBO", origin_city: "Nairobi", destination_icao: "FAOR", destination_iata: "JNB", destination_city: "Johannesburg", aircraft_tail: "5Y-SKH", aircraft_model: "737 MAX 8", status: "Boarding", scheduled_departure: minutesFromNow(25), scheduled_arrival: hoursFromNow(3.5), actual_departure: null, actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.91, distance_nm: 1666, pax_count: 178, co2_kg_planned: 28900, progress_pct: null },
  { id: "com-005", flight_number: "ST-455", origin_icao: "EGLL", origin_iata: "LHR", origin_city: "London", destination_icao: "HKJK", destination_iata: "NBO", destination_city: "Nairobi", aircraft_tail: "5Y-SKB", aircraft_model: "787-8 Dreamliner", status: "Delayed", scheduled_departure: minutesFromNow(-40), scheduled_arrival: hoursFromNow(8), actual_departure: null, actual_arrival: null, delay_minutes: 55, predicted_delay_min: 65, delay_prediction_conf: 0.78, distance_nm: 4224, pax_count: 248, co2_kg_planned: 94600, progress_pct: null },
  { id: "com-006", flight_number: "ST-190", origin_icao: "HTDA", origin_iata: "DAR", origin_city: "Dar es Salaam", destination_icao: "HKJK", destination_iata: "NBO", destination_city: "Nairobi", aircraft_tail: "5Y-SKG", aircraft_model: "A319-111", status: "Scheduled", scheduled_departure: hoursFromNow(2), scheduled_arrival: hoursFromNow(3.3), actual_departure: null, actual_arrival: null, delay_minutes: 0, predicted_delay_min: 18, delay_prediction_conf: 0.64, distance_nm: 477, pax_count: 120, co2_kg_planned: 12300, progress_pct: null },
  { id: "com-007", flight_number: "ST-067", origin_icao: "LFPG", origin_iata: "CDG", origin_city: "Paris", destination_icao: "HKJK", destination_iata: "NBO", destination_city: "Nairobi", aircraft_tail: "5Y-SKA", aircraft_model: "A320neo", status: "Cancelled", scheduled_departure: hoursFromNow(5), scheduled_arrival: hoursFromNow(13), actual_departure: null, actual_arrival: null, delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.99, distance_nm: 3720, pax_count: 0, co2_kg_planned: 0, progress_pct: null },
  { id: "com-008", flight_number: "ST-502", origin_icao: "DNMM", origin_iata: "LOS", origin_city: "Lagos", destination_icao: "HKJK", destination_iata: "NBO", destination_city: "Nairobi", aircraft_tail: "5Y-SKD", aircraft_model: "737-800", status: "Landed", scheduled_departure: hoursFromNow(-5), scheduled_arrival: hoursFromNow(-1.5), actual_departure: hoursFromNow(-5), actual_arrival: hoursFromNow(-1.6), delay_minutes: 0, predicted_delay_min: 0, delay_prediction_conf: 0.98, distance_nm: 2488, pax_count: 162, co2_kg_planned: 36400, progress_pct: 100 },
];

// Tier comes from the DB-backed org row via useResolvedTier (see below); never localStorage.

function KpiTile({
  label, value, sub, valueClass = "text-slate-100", accent = "rgba(255,255,255,0.05)",
}: { label: string; value: string | number; sub?: string; valueClass?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl px-4 py-3.5"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}` }}>
      <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </span>
      <span className={`text-[24px] font-semibold leading-none ${valueClass}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-slate-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>}
    </div>
  );
}

const STATUS_ORDER: Record<FlightStatus, number> = {
  Approach: 0, En_Route: 1, Departed: 2, Boarding: 3, Delayed: 4, Diverted: 5, Scheduled: 6, Landed: 7, Cancelled: 8,
};

type FilterKey = "All" | "Active" | "Delayed" | "Landed" | "Cancelled";

function FlightsPage() {
  const tier: PlatformTier = useResolvedTier();
  const flights = tier === "flight_school" ? FLIGHT_SCHOOL_FLIGHTS : COMMERCIAL_FLIGHTS;
  const [filter, setFilter] = useState<FilterKey>("All");

  const summary = useMemo(() => {
    const airborne = flights.filter((f) => ["En_Route", "Departed", "Approach", "Boarding"].includes(f.status)).length;
    const delayed = flights.filter((f) => f.status === "Delayed" || f.delay_minutes > 5).length;
    const cancelled = flights.filter((f) => f.status === "Cancelled").length;
    const onTime = flights.filter((f) => f.delay_minutes === 0 && f.status !== "Cancelled" && f.status !== "Delayed").length;
    const totalCo2 = flights.reduce((s, f) => s + f.co2_kg_planned / 1000, 0);
    const delayedFs = flights.filter((f) => f.delay_minutes > 0);
    const avgDelay = delayedFs.length ? Math.round(delayedFs.reduce((s, f) => s + f.delay_minutes, 0) / delayedFs.length) : 0;
    return { total: flights.length, airborne, delayed, cancelled, onTime, totalCo2, avgDelay };
  }, [flights]);

  const visible = useMemo(() => {
    let v = flights;
    if (filter === "Active") v = flights.filter((f) => ["En_Route", "Departed", "Approach", "Boarding"].includes(f.status));
    else if (filter === "Delayed") v = flights.filter((f) => f.status === "Delayed" || f.delay_minutes > 5);
    else if (filter === "Landed") v = flights.filter((f) => f.status === "Landed");
    else if (filter === "Cancelled") v = flights.filter((f) => f.status === "Cancelled");
    return [...v].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [flights, filter]);

  const tierLabel = tier === "flight_school" ? "Training Ops" : "Commercial Ops";
  const totalCo2Str = summary.totalCo2 >= 1 ? `${summary.totalCo2.toFixed(1)}t CO₂` : `${Math.round(summary.totalCo2 * 1000)}kg CO₂`;

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "All", label: "All", count: flights.length },
    { key: "Active", label: "Active", count: summary.airborne },
    { key: "Delayed", label: "Delayed", count: summary.delayed },
    { key: "Landed", label: "Landed", count: flights.filter((f) => f.status === "Landed").length },
    { key: "Cancelled", label: "Cancelled", count: summary.cancelled },
  ];

  return (
    <div className="min-h-full px-6 py-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-8 flex flex-col gap-1">
        <div className="flex items-end gap-3">
          <h1 className="text-[26px] font-semibold leading-none tracking-tight text-slate-100">Flights</h1>
          <span className="mb-0.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400"
            style={{ borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.05)", fontFamily: "'JetBrains Mono', monospace" }}>
            {tierLabel}
          </span>
        </div>
        <p className="text-[13px] text-slate-400">
          Live board with AI delay predictions, route tracking, and
          {tier === "commercial_airline" ? " ICAO carbon emissions per sector." : " training sortie status across the fleet."}
        </p>
      </div>

      <section className="mb-6" aria-labelledby="ops-summary-h">
        <h2 id="ops-summary-h" className="sr-only">Flight operations summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Total Flights" value={summary.total} sub="today's schedule" />
        <KpiTile label="Airborne" value={summary.airborne} sub="active sectors" valueClass="text-emerald-400" accent="rgba(52,211,153,0.10)" />
        <KpiTile label="On Time" value={summary.onTime} sub="no delays" valueClass="text-emerald-400" accent="rgba(52,211,153,0.08)" />
        <KpiTile label="Delayed" value={summary.delayed} sub={summary.avgDelay > 0 ? `avg +${summary.avgDelay}m` : "none delayed"}
          valueClass={summary.delayed > 0 ? "text-amber-400" : "text-slate-400"}
          accent={summary.delayed > 0 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)"} />
        <KpiTile label="Cancelled" value={summary.cancelled} sub="ops affected"
          valueClass={summary.cancelled > 0 ? "text-red-400" : "text-slate-400"}
          accent={summary.cancelled > 0 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)"} />
        {tier === "commercial_airline" ? (
          <KpiTile label="Planned CO₂" value={totalCo2Str} sub="today's emissions" valueClass="text-slate-300" accent="rgba(52,211,153,0.06)" />
        ) : (
          <KpiTile label="Sorties" value={flights.filter((f) => f.status !== "Cancelled").length} sub="planned today" valueClass="text-sky-400" accent="rgba(56,189,248,0.1)" />
        )}
        </div>
      </section>

      <section className="mb-6" aria-labelledby="live-map-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="live-map-h" className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Live Route Map
          </h2>
          <span className="text-[9px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Equirectangular · Positions update 30s
          </span>
        </div>
        <LiveMap flights={flights} height={260} />
      </section>

      <section aria-labelledby="flight-board-h">
        <h2 id="flight-board-h" className="sr-only">Flight board</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${
                filter === f.key
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}>
              <span className="text-[11px] font-medium">{f.label}</span>
              <span className={`rounded px-1 text-[9px] font-semibold ${filter === f.key ? "bg-emerald-500/15" : "bg-slate-800"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {f.count}
              </span>
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[11px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {visible.length} of {flights.length} flights
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {visible.map((flight, i) => <FlightRow key={flight.id} flight={flight} index={i} />)}
        </div>

        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl py-24"
            style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)" }}>
            <p className="text-[14px] text-slate-400">No flights match this filter.</p>
          </div>
        )}
      </section>

      <p className="mt-10 text-center text-[10px] tracking-[0.12em] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        SKYTRACK AAOS · FLIGHTS BOARD · {tier === "commercial_airline" ? "ICAO ANNEX 6 · CORSIA ALIGNED" : "KCAA PART 141 TRAINING OPS"} · AI PREDICTIONS BY SKYTRACK ML v2
      </p>
    </div>
  );
}
