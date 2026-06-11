import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { HealthGauge } from "@/components/fleet/HealthGauge";
import { declareAOG } from "@/lib/eventEngine";
import type { PlatformTier } from "@/lib/tierGuard";

export type AircraftStatus = "In-Flight" | "AOG" | "Maintenance" | "Standby";

export interface AircraftCardData {
  id: string;
  tail_number: string;
  model: string;
  manufacturer: string;
  status: AircraftStatus;
  health_score: number;
  total_flight_hours: number;
  next_inspection: string | null;
  last_inspection: string | null;
  base_airport_icao?: string | null;
  rul_hours?: number | null;
  rul_cycles?: number | null;
  org_tier: PlatformTier;
  active_flight?: string | null;
}

interface AircraftCardProps {
  aircraft: AircraftCardData;
  index?: number;
}

interface StatusConfig {
  label: string;
  dotClass: string;
  textClass: string;
  borderColor: string;
  bgStyle: string;
  pulse: boolean;
}

function resolveStatus(status: AircraftStatus): StatusConfig {
  switch (status) {
    case "In-Flight":
      return {
        label: "Airborne",
        dotClass: "bg-emerald-400",
        textClass: "text-emerald-400",
        borderColor: "rgba(16,185,129,0.2)",
        bgStyle: "rgba(16,185,129,0.07)",
        pulse: true,
      };
    case "AOG":
      return {
        label: "AOG",
        dotClass: "bg-red-500",
        textClass: "text-red-400",
        borderColor: "rgba(239,68,68,0.25)",
        bgStyle: "rgba(239,68,68,0.07)",
        pulse: true,
      };
    case "Maintenance":
      return {
        label: "MRO Check",
        dotClass: "bg-amber-400",
        textClass: "text-amber-400",
        borderColor: "rgba(245,158,11,0.2)",
        bgStyle: "rgba(245,158,11,0.07)",
        pulse: false,
      };
    case "Standby":
    default:
      return {
        label: "Ground Ready",
        dotClass: "bg-slate-500",
        textClass: "text-slate-400",
        borderColor: "rgba(100,116,139,0.3)",
        bgStyle: "rgba(100,116,139,0.05)",
        pulse: false,
      };
  }
}

function deriveCategoryTag(
  model: string,
  tier: PlatformTier,
): { label: string; colorClass: string } {
  const m = model.toLowerCase();
  if (tier === "flight_school") {
    if (m.includes("172") || m.includes("cessna"))
      return { label: "Light Trainer", colorClass: "text-sky-400 border-sky-500/20 bg-sky-500/10" };
    if (m.includes("pa-28") || m.includes("piper") || m.includes("archer"))
      return { label: "Training SEP", colorClass: "text-sky-400 border-sky-500/20 bg-sky-500/10" };
    if (m.includes("twin") || m.includes("seminole") || m.includes("multi"))
      return { label: "Multi-Engine", colorClass: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10" };
    return { label: "Trainer", colorClass: "text-sky-400 border-sky-500/20 bg-sky-500/10" };
  }
  if (m.includes("787") || m.includes("dreamliner") || m.includes("a350"))
    return { label: "Wide-body", colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
  if (m.includes("777") || m.includes("a340") || m.includes("a380"))
    return { label: "Heavy", colorClass: "text-violet-400 border-violet-500/20 bg-violet-500/10" };
  if (m.includes("737") || m.includes("a320") || m.includes("a321") || m.includes("a319"))
    return { label: "Narrow-body", colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
  if (m.includes("e1") || m.includes("e2") || m.includes("erj") || m.includes("crj"))
    return { label: "Regional Jet", colorClass: "text-teal-400 border-teal-500/20 bg-teal-500/10" };
  return { label: "Commercial", colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" };
}

function formatInspectionDate(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const abs = Math.abs(diffDays);
  if (diffDays < 0) return abs === 1 ? "Overdue 1 day" : `Overdue ${abs}d`;
  if (diffDays === 0) return "Due today";
  if (diffDays <= 7) return `In ${diffDays}d`;
  if (diffDays <= 30) return `In ${Math.round(diffDays / 7)}wk`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isInspectionUrgent(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
}

function formatFlightHours(hours: number): string {
  if (hours >= 10000) return `${(hours / 1000).toFixed(1)}k hrs`;
  return `${hours.toLocaleString("en-US", { maximumFractionDigits: 0 })} hrs`;
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function AircraftCard({ aircraft, index = 0 }: AircraftCardProps) {
  const [hovered, setHovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const statusConfig = resolveStatus(aircraft.status);
  const categoryTag = deriveCategoryTag(aircraft.model, aircraft.org_tier);
  const inspectionStr = formatInspectionDate(aircraft.next_inspection);
  const inspUrgent = isInspectionUrgent(aircraft.next_inspection);
  const isAOG = aircraft.status === "AOG";
  const animDelay = `${index * 55}ms`;

  async function onDeclareAOG(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isAOG || busy) return;
    if (!confirm(`Declare ${aircraft.tail_number} AOG? This will create a work order, flag crew, and notify cargo.`)) return;
    setBusy(true);
    try {
      await declareAOG(aircraft.id);
      await qc.invalidateQueries({ queryKey: ["aircraft"] });
      await qc.invalidateQueries({ queryKey: ["maintenance"] });
      await qc.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      <style>{`
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .aircraft-card { animation: cardEntrance 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes aogFlicker { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .aog-flicker { animation: aogFlicker 1.8s ease-in-out infinite; }
      `}</style>

      <Link
        to="/fleet"
        className="aircraft-card group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
        style={{ animationDelay: animDelay }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`${aircraft.tail_number} — ${aircraft.model} — ${statusConfig.label}`}
      >
        <article
          className="relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
          style={{
            background: hovered
              ? "linear-gradient(145deg, rgba(15,26,50,0.98) 0%, rgba(8,18,38,0.98) 100%)"
              : "linear-gradient(145deg, rgba(10,20,42,0.97) 0%, rgba(5,12,26,0.97) 100%)",
            border: isAOG
              ? "1px solid rgba(239,68,68,0.25)"
              : hovered
                ? "1px solid rgba(52,211,153,0.18)"
                : "1px solid rgba(255,255,255,0.05)",
            boxShadow: hovered
              ? "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.06)"
              : isAOG
                ? "0 4px 24px rgba(239,68,68,0.12)"
                : "0 2px 16px rgba(0,0,0,0.35)",
            transform: hovered ? "translateY(-2px)" : "translateY(0)",
            backdropFilter: "blur(16px)",
          }}
        >
          {isAOG && (
            <div
              className="aog-flicker absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 py-1.5"
              style={{
                background: "rgba(239,68,68,0.12)",
                borderBottom: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Aircraft on Ground — Immediate Attention Required
              </span>
            </div>
          )}

          <div className={isAOG ? "pt-8" : ""}>
            <div className="flex items-start justify-between px-5 pt-5">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[18px] font-semibold leading-none tracking-tight text-slate-100 group-hover:text-white"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {aircraft.tail_number}
                  </span>
                  {aircraft.active_flight && (
                    <span
                      className="rounded border px-1.5 py-px text-[9px] font-semibold tracking-wider text-emerald-400"
                      style={{
                        borderColor: "rgba(52,211,153,0.2)",
                        background: "rgba(52,211,153,0.06)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {aircraft.active_flight}
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 truncate text-[12px] font-medium text-slate-400"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {aircraft.manufacturer} {aircraft.model}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${categoryTag.colorClass}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {categoryTag.label}
                  </span>
                  {aircraft.base_airport_icao && (
                    <span
                      className="flex items-center gap-1 text-[10px] text-slate-500"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <Icon
                        className="h-2.5 w-2.5"
                        d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
                      />
                      {aircraft.base_airport_icao}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
                style={{
                  background: statusConfig.bgStyle,
                  border: `1px solid ${statusConfig.borderColor}`,
                }}
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  {statusConfig.pulse && (
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${statusConfig.dotClass}`}
                    />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`}
                  />
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${statusConfig.textClass}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>

            <div className="mx-5 my-4 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

            <div className="flex items-center gap-4 px-5">
              <div className="shrink-0">
                <HealthGauge
                  score={aircraft.health_score}
                  rulHours={aircraft.rul_hours}
                  rulCycles={aircraft.rul_cycles}
                  size={120}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className="h-3 w-3 text-slate-500"
                      d="M22 12h-4l-3 9L9 3l-3 9H2"
                    />
                    <span
                      className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Total Hours
                    </span>
                  </div>
                  <span
                    className="text-[14px] font-semibold leading-none text-slate-200"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {formatFlightHours(aircraft.total_flight_hours)}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className="h-3 w-3 text-slate-500"
                      d="M3 6h18M3 6v14a2 2 0 002 2h14a2 2 0 002-2V6M8 2v4M16 2v4"
                    />
                    <span
                      className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Next Check
                    </span>
                  </div>
                  <span
                    className={`text-[13px] font-medium leading-none ${
                      inspUrgent ? "text-amber-400" : "text-slate-200"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {inspectionStr}
                  </span>
                </div>

                {aircraft.last_inspection && (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className="h-3 w-3 text-slate-500"
                        d="M12 6v6l4 2M12 22a10 10 0 110-20 10 10 0 010 20z"
                      />
                      <span
                        className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Last Check
                      </span>
                    </div>
                    <span
                      className="text-[12px] text-slate-400"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {new Date(aircraft.last_inspection).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className="mt-4 flex items-center justify-between border-t px-5 py-3"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.15em] text-slate-500"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {aircraft.id.slice(0, 8).toUpperCase()}
                </span>
                {!isAOG && (
                  <button
                    type="button"
                    onClick={onDeclareAOG}
                    disabled={busy}
                    className="rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    style={{
                      borderColor: "rgba(239,68,68,0.25)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    aria-label={`Declare ${aircraft.tail_number} AOG`}
                  >
                    {busy ? "…" : "Declare AOG"}
                  </button>
                )}
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  hovered ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif" }}>View Aircraft</span>
                <Icon
                  className={`h-3 w-3 transition-transform duration-200 ${
                    hovered ? "translate-x-0.5" : ""
                  }`}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </div>
            </div>
          </div>
        </article>
      </Link>
    </>
  );
}
