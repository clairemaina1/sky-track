import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AircraftCard,
  type AircraftCardData,
  type AircraftStatus,
} from "@/components/fleet/AircraftCard";
import type { PlatformTier } from "@/lib/tierGuard";

export const Route = createFileRoute("/_authenticated/fleet")({
  component: FleetPage,
});

// ─────────────────────────────────────────────────────────────
// Mock fleet — mirrors Supabase `aircraft` schema shape.
// ─────────────────────────────────────────────────────────────
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const FLIGHT_SCHOOL_FLEET: AircraftCardData[] = [
  { id: "fs-001-cessna-172s", tail_number: "5Y-CKA", model: "172S Skyhawk SP", manufacturer: "Cessna", status: "In-Flight", health_score: 94, total_flight_hours: 3821, next_inspection: days(18), last_inspection: days(-74), base_airport_icao: "HKWL", rul_hours: 412, rul_cycles: 388, org_tier: "flight_school", active_flight: "ST-TRN01" },
  { id: "fs-002-cessna-172r", tail_number: "5Y-CKB", model: "172R Skyhawk", manufacturer: "Cessna", status: "Standby", health_score: 88, total_flight_hours: 5140, next_inspection: days(31), last_inspection: days(-57), base_airport_icao: "HKWL", rul_hours: 290, rul_cycles: 271, org_tier: "flight_school" },
  { id: "fs-003-piper-pa28-161", tail_number: "5Y-PKA", model: "PA-28-161 Warrior III", manufacturer: "Piper", status: "Maintenance", health_score: 71, total_flight_hours: 7603, next_inspection: days(4), last_inspection: days(-88), base_airport_icao: "HKWL", rul_hours: 118, rul_cycles: 102, org_tier: "flight_school" },
  { id: "fs-004-piper-pa28-181", tail_number: "5Y-PKB", model: "PA-28-181 Archer TX", manufacturer: "Piper", status: "In-Flight", health_score: 91, total_flight_hours: 2905, next_inspection: days(45), last_inspection: days(-33), base_airport_icao: "HKWL", rul_hours: 520, rul_cycles: 498, org_tier: "flight_school", active_flight: "ST-TRN02" },
  { id: "fs-005-piper-seminole", tail_number: "5Y-PKC", model: "PA-44-180 Seminole", manufacturer: "Piper", status: "AOG", health_score: 42, total_flight_hours: 9112, next_inspection: days(-2), last_inspection: days(-122), base_airport_icao: "HKWL", rul_hours: 34, rul_cycles: 28, org_tier: "flight_school" },
  { id: "fs-006-cessna-172s-b", tail_number: "5Y-CKC", model: "172S Skyhawk SP", manufacturer: "Cessna", status: "Standby", health_score: 97, total_flight_hours: 1204, next_inspection: days(62), last_inspection: days(-16), base_airport_icao: "HKWL", rul_hours: 788, rul_cycles: 754, org_tier: "flight_school" },
];

const COMMERCIAL_FLEET: AircraftCardData[] = [
  { id: "ca-001-a320neo", tail_number: "5Y-SKA", model: "A320neo", manufacturer: "Airbus", status: "In-Flight", health_score: 96, total_flight_hours: 12440, next_inspection: days(22), last_inspection: days(-41), base_airport_icao: "HKJK", rul_hours: 1840, rul_cycles: 1620, org_tier: "commercial_airline", active_flight: "ST-101" },
  { id: "ca-002-b787-8", tail_number: "5Y-SKB", model: "787-8 Dreamliner", manufacturer: "Boeing", status: "Standby", health_score: 89, total_flight_hours: 28330, next_inspection: days(9), last_inspection: days(-79), base_airport_icao: "HKJK", rul_hours: 3200, rul_cycles: 1880, org_tier: "commercial_airline" },
  { id: "ca-003-a321neo", tail_number: "5Y-SKC", model: "A321neo", manufacturer: "Airbus", status: "In-Flight", health_score: 93, total_flight_hours: 8770, next_inspection: days(38), last_inspection: days(-20), base_airport_icao: "HKJK", rul_hours: 2110, rul_cycles: 1940, org_tier: "commercial_airline", active_flight: "ST-204" },
  { id: "ca-004-b737-800", tail_number: "5Y-SKD", model: "737-800", manufacturer: "Boeing", status: "Maintenance", health_score: 74, total_flight_hours: 41200, next_inspection: days(3), last_inspection: days(-95), base_airport_icao: "HKJK", rul_hours: 620, rul_cycles: 440, org_tier: "commercial_airline" },
  { id: "ca-005-a320ceo", tail_number: "5Y-SKE", model: "A320-214", manufacturer: "Airbus", status: "AOG", health_score: 38, total_flight_hours: 53880, next_inspection: days(-1), last_inspection: days(-140), base_airport_icao: "HTDA", rul_hours: 22, rul_cycles: 14, org_tier: "commercial_airline" },
  { id: "ca-006-b787-9", tail_number: "5Y-SKF", model: "787-9 Dreamliner", manufacturer: "Boeing", status: "In-Flight", health_score: 98, total_flight_hours: 6550, next_inspection: days(71), last_inspection: days(-8), base_airport_icao: "HKJK", rul_hours: 4900, rul_cycles: 3210, org_tier: "commercial_airline", active_flight: "ST-088" },
  { id: "ca-007-a319", tail_number: "5Y-SKG", model: "A319-111", manufacturer: "Airbus", status: "Standby", health_score: 82, total_flight_hours: 31440, next_inspection: days(14), last_inspection: days(-55), base_airport_icao: "HKJK", rul_hours: 980, rul_cycles: 860, org_tier: "commercial_airline" },
  { id: "ca-008-b737-max8", tail_number: "5Y-SKH", model: "737 MAX 8", manufacturer: "Boeing", status: "In-Flight", health_score: 95, total_flight_hours: 4120, next_inspection: days(55), last_inspection: days(-28), base_airport_icao: "HKJK", rul_hours: 3640, rul_cycles: 2880, org_tier: "commercial_airline", active_flight: "ST-312" },
];

function resolveTier(): PlatformTier {
  if (typeof window === "undefined") return "commercial_airline";
  return window.localStorage.getItem("skytrack.tier") === "flight_school"
    ? "flight_school"
    : "commercial_airline";
}

interface FleetSummary {
  total: number;
  airborne: number;
  aog: number;
  maintenance: number;
  avgHealth: number;
  criticalCount: number;
}

function deriveFleetSummary(fleet: AircraftCardData[]): FleetSummary {
  const total = fleet.length;
  const airborne = fleet.filter((a) => a.status === "In-Flight").length;
  const aog = fleet.filter((a) => a.status === "AOG").length;
  const maintenance = fleet.filter((a) => a.status === "Maintenance").length;
  const avgHealth = total ? Math.round(fleet.reduce((s, a) => s + a.health_score, 0) / total) : 0;
  const criticalCount = fleet.filter((a) => a.health_score < 70).length;
  return { total, airborne, aog, maintenance, avgHealth, criticalCount };
}

function KpiTile({
  label,
  value,
  subtext,
  accentClass = "text-slate-100",
  borderStyle = "rgba(255,255,255,0.05)",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  accentClass?: string;
  borderStyle?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl px-5 py-4"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${borderStyle}` }}
    >
      <span
        className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-slate-500"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </span>
      <span
        className={`text-[28px] font-semibold leading-none ${accentClass}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {value}
      </span>
      {subtext && (
        <span className="text-[10px] text-slate-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

function FleetHealthBar({ fleet }: { fleet: AircraftCardData[] }) {
  const optimal = fleet.filter((a) => a.health_score >= 90).length;
  const advisory = fleet.filter((a) => a.health_score >= 70 && a.health_score < 90).length;
  const critical = fleet.filter((a) => a.health_score < 70).length;
  const total = fleet.length;
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-slate-500"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        Fleet Health Distribution
      </span>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.04)" }}
        role="img"
        aria-label={`${optimal} optimal, ${advisory} advisory, ${critical} critical`}
      >
        {optimal > 0 && <div className="h-full transition-all duration-700" style={{ width: pct(optimal), background: "#10b981" }} />}
        {advisory > 0 && <div className="h-full transition-all duration-700" style={{ width: pct(advisory), background: "#f59e0b" }} />}
        {critical > 0 && <div className="h-full transition-all duration-700" style={{ width: pct(critical), background: "#ef4444" }} />}
      </div>
      <div className="flex gap-4">
        {[
          { color: "#10b981", label: "Optimal", count: optimal },
          { color: "#f59e0b", label: "Advisory", count: advisory },
          { color: "#ef4444", label: "Critical", count: critical },
        ].map(({ color, label, count }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[9px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {count} {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type FilterKey = "All" | AircraftStatus;

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all duration-150 ${
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-slate-800 bg-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
      }`}
    >
      <span className="text-[11px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
      <span
        className={`rounded px-1 text-[9px] font-semibold ${
          active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {count}
      </span>
    </button>
  );
}

function FleetPage() {
  const tier = resolveTier();
  const fleet = tier === "flight_school" ? FLIGHT_SCHOOL_FLEET : COMMERCIAL_FLEET;
  const summary = useMemo(() => deriveFleetSummary(fleet), [fleet]);
  const [filter, setFilter] = useState<FilterKey>("All");

  const visible = useMemo(
    () => (filter === "All" ? fleet : fleet.filter((a) => a.status === filter)),
    [fleet, filter],
  );

  const tierLabel = tier === "flight_school" ? "Training Fleet" : "Commercial Fleet";

  const filters: { key: FilterKey; label: string }[] = [
    { key: "All", label: "All" },
    { key: "In-Flight", label: "Airborne" },
    { key: "Standby", label: "Standby" },
    { key: "Maintenance", label: "Maintenance" },
    { key: "AOG", label: "AOG" },
  ];

  return (
    <>
      <style>{`
        @keyframes bannerIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .banner-in { animation: bannerIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="min-h-full px-6 py-8" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        <div className="banner-in mb-8 flex flex-col gap-1">
          <div className="flex items-end gap-3">
            <h1 className="text-[26px] font-semibold leading-none tracking-tight text-slate-100">
              Fleet
            </h1>
            <span
              className="mb-0.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400"
              style={{
                borderColor: "rgba(52,211,153,0.2)",
                background: "rgba(52,211,153,0.05)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {tierLabel}
            </span>
          </div>
          <p className="text-[13px] text-slate-400">
            Real-time aircraft registry, health scoring, and maintenance horizon visibility.
          </p>
        </div>

        <section
          className="banner-in mb-8 rounded-2xl p-6"
          style={{
            background: "linear-gradient(145deg, rgba(10,20,42,0.9) 0%, rgba(5,12,26,0.9) 100%)",
            border: "1px solid rgba(52,211,153,0.08)",
            animationDelay: "0.05s",
          }}
          aria-label="Fleet summary metrics"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
            <KpiTile label="Fleet Strength" value={summary.total} subtext="registered aircraft" />
            <KpiTile
              label="Active Airborne"
              value={summary.airborne}
              subtext={`${summary.total ? Math.round((summary.airborne / summary.total) * 100) : 0}% utilisation`}
              accentClass="text-emerald-400"
              borderStyle="rgba(52,211,153,0.1)"
            />
            <KpiTile
              label="AOG / Critical"
              value={summary.aog + summary.maintenance}
              subtext={`${summary.aog} AOG · ${summary.maintenance} MRO`}
              accentClass={summary.aog > 0 ? "text-red-400" : "text-amber-400"}
              borderStyle={summary.aog > 0 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.12)"}
            />
            <KpiTile
              label="Avg Health"
              value={`${summary.avgHealth}%`}
              subtext="fleet-wide score"
              accentClass={
                summary.avgHealth >= 90
                  ? "text-emerald-400"
                  : summary.avgHealth >= 70
                    ? "text-amber-400"
                    : "text-red-400"
              }
            />
            <KpiTile
              label="Health Alerts"
              value={summary.criticalCount}
              subtext="aircraft below 70%"
              accentClass={summary.criticalCount === 0 ? "text-slate-400" : "text-red-400"}
              borderStyle={summary.criticalCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)"}
            />
          </div>

          <FleetHealthBar fleet={fleet} />
        </section>

        <div
          className="mb-6 flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Filter fleet by status"
        >
          {filters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              count={f.key === "All" ? fleet.length : fleet.filter((a) => a.status === f.key).length}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
            />
          ))}
          <div className="flex-1" />
          <span className="text-[11px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {visible.length} of {fleet.length} aircraft
          </span>
        </div>

        {visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-24"
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px dashed rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[14px] text-slate-400">No aircraft match this filter.</p>
            <p className="mt-1 text-[12px] text-slate-500">Try a different status.</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}
          >
            {visible.map((aircraft, index) => (
              <AircraftCard key={aircraft.id} aircraft={aircraft} index={index} />
            ))}
          </div>
        )}

        <p
          className="mt-10 text-center text-[10px] tracking-[0.12em] text-slate-500"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          SKYTRACK AAOS · FLEET DATA REFRESHES EVERY 30s ·{" "}
          {tier === "commercial_airline" ? "ICAO ANNEX 6 COMPLIANT" : "KCAA PART 141 COMPLIANT"}
        </p>
      </div>
    </>
  );
}
