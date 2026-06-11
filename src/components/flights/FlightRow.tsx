import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DelayPredictionChip } from "@/components/flights/DelayPredictionChip";

export type FlightStatus =
  | "Scheduled"
  | "Boarding"
  | "Departed"
  | "En_Route"
  | "Approach"
  | "Landed"
  | "Delayed"
  | "Diverted"
  | "Cancelled";

export interface FlightRowData {
  id: string;
  flight_number: string;
  origin_icao: string;
  origin_iata: string;
  origin_city: string;
  destination_icao: string;
  destination_iata: string;
  destination_city: string;
  aircraft_tail: string;
  aircraft_model: string;
  status: FlightStatus;
  scheduled_departure: string;
  scheduled_arrival: string;
  actual_departure?: string | null;
  actual_arrival?: string | null;
  delay_minutes: number;
  predicted_delay_min: number;
  delay_prediction_conf: number;
  distance_nm: number;
  pax_count: number;
  co2_kg_planned: number;
  progress_pct?: number | null;
}

interface StatusCfg {
  label: string;
  dotClass: string;
  textClass: string;
  bgStyle: string;
  borderColor: string;
  pulse: boolean;
}

function resolveFlightStatus(s: FlightStatus): StatusCfg {
  switch (s) {
    case "Boarding":
      return { label: "Boarding", dotClass: "bg-sky-400", textClass: "text-sky-400", bgStyle: "rgba(56,189,248,0.06)", borderColor: "rgba(56,189,248,0.18)", pulse: true };
    case "Departed":
    case "En_Route":
      return { label: s === "Departed" ? "Departed" : "En Route", dotClass: "bg-emerald-400", textClass: "text-emerald-400", bgStyle: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.18)", pulse: true };
    case "Approach":
      return { label: "On Approach", dotClass: "bg-teal-400", textClass: "text-teal-400", bgStyle: "rgba(45,212,191,0.06)", borderColor: "rgba(45,212,191,0.18)", pulse: true };
    case "Landed":
      return { label: "Landed", dotClass: "bg-slate-500", textClass: "text-slate-400", bgStyle: "rgba(100,116,139,0.04)", borderColor: "rgba(100,116,139,0.14)", pulse: false };
    case "Delayed":
      return { label: "Delayed", dotClass: "bg-amber-400", textClass: "text-amber-400", bgStyle: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)", pulse: true };
    case "Diverted":
      return { label: "Diverted", dotClass: "bg-orange-400", textClass: "text-orange-400", bgStyle: "rgba(251,146,60,0.06)", borderColor: "rgba(251,146,60,0.2)", pulse: true };
    case "Cancelled":
      return { label: "Cancelled", dotClass: "bg-red-500", textClass: "text-red-400", bgStyle: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)", pulse: false };
    default:
      return { label: "Scheduled", dotClass: "bg-slate-600", textClass: "text-slate-400", bgStyle: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)", pulse: false };
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDuration(d: string, a: string) {
  const m = Math.round((new Date(a).getTime() - new Date(d).getTime()) / 60000);
  return `${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, "0")}m`;
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ProgressTrack({ pct }: { pct: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
      <circle cx="14" cy="14" r={r} fill="none" stroke="#10b981" strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 14 14)" opacity="0.8" />
      <circle cx="14" cy="14" r="2" fill="#10b981" opacity="0.6" />
    </svg>
  );
}

interface FlightRowProps {
  flight: FlightRowData;
  index?: number;
}

export function FlightRow({ flight, index = 0 }: FlightRowProps) {
  const [hovered, setHovered] = useState(false);
  const statusCfg = resolveFlightStatus(flight.status);
  const isActive = ["Boarding", "Departed", "En_Route", "Approach"].includes(flight.status);
  const isCancelled = flight.status === "Cancelled";
  const duration = formatDuration(flight.scheduled_departure, flight.scheduled_arrival);

  return (
    <>
      <style>{`
        @keyframes rowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .flight-row { animation: rowIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <Link
        to="/flights/$id"
        params={{ id: flight.id }}
        className="flight-row group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
        style={{ animationDelay: `${index * 40}ms` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Flight ${flight.flight_number} from ${flight.origin_city} to ${flight.destination_city}`}
      >
        <div
          className="relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200"
          style={{
            background: hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
            border: `1px solid ${hovered ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)"}`,
            opacity: isCancelled ? 0.45 : 1,
          }}
        >
          <div className="flex w-[110px] shrink-0 flex-col gap-0.5">
            <span className="text-[14px] font-semibold leading-none text-slate-100" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {flight.flight_number}
            </span>
            <span className="text-[10px] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {flight.aircraft_tail}
            </span>
            <span className="text-[9.5px] text-slate-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {flight.aircraft_model}
            </span>
          </div>

          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex flex-col items-end gap-0.5 w-[80px] shrink-0">
              <span className="text-[18px] font-semibold leading-none text-slate-100" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
                {flight.origin_iata}
              </span>
              <span className="text-[9px] text-slate-400 text-right" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {flight.origin_city}
              </span>
              <span
                className={`text-[11px] font-medium ${flight.actual_departure && flight.delay_minutes > 0 ? "text-amber-400" : "text-slate-300"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {flight.actual_departure ? formatTime(flight.actual_departure) : formatTime(flight.scheduled_departure)}
              </span>
            </div>

            <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
              <span className="text-[9px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {duration}
              </span>
              <div className="flex w-full items-center gap-1">
                <div className="h-px flex-1 rounded-full" style={{
                  background: isActive
                    ? "linear-gradient(90deg, rgba(52,211,153,0.3) 0%, rgba(52,211,153,0.08) 100%)"
                    : "rgba(255,255,255,0.06)",
                }} />
                {isActive && flight.progress_pct != null ? (
                  <ProgressTrack pct={flight.progress_pct} />
                ) : (
                  <Icon d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-1 .15-1 1.35 0 1.5l7.2 1.2 1.2 7.2c.15 1 1.35 1 1.5 0l1.2-7.2z"
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-emerald-500" : "text-slate-500"}`} />
                )}
                <div className="h-px flex-1 rounded-full" style={{
                  background: isActive ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.06)",
                }} />
              </div>
              <span className="text-[9px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {flight.distance_nm.toLocaleString()}nm
              </span>
            </div>

            <div className="flex flex-col items-start gap-0.5 w-[80px] shrink-0">
              <span className="text-[18px] font-semibold leading-none text-slate-100" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
                {flight.destination_iata}
              </span>
              <span className="text-[9px] text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {flight.destination_city}
              </span>
              <span className="text-[11px] font-medium text-slate-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {flight.actual_arrival ? formatTime(flight.actual_arrival) : formatTime(flight.scheduled_arrival)}
              </span>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: statusCfg.bgStyle, border: `1px solid ${statusCfg.borderColor}`, minWidth: "90px", justifyContent: "center" }}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {statusCfg.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${statusCfg.dotClass}`} />}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
            </span>
            <span className={`text-[10px] font-semibold ${statusCfg.textClass}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {statusCfg.label}
            </span>
          </div>

          <div className="w-[90px] shrink-0">
            <DelayPredictionChip
              predictedDelayMin={flight.predicted_delay_min}
              confidenceScore={flight.delay_prediction_conf}
              compact
            />
          </div>

          <div className="hidden xl:flex flex-col gap-1.5 w-[80px] shrink-0">
            <div className="flex items-center gap-1">
              <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {flight.pax_count} pax
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Icon d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6" className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {(flight.co2_kg_planned / 1000).toFixed(1)}t CO₂
              </span>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
