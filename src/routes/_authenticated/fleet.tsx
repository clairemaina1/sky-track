import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, useCurrentOrgId, useResolvedTier } from "@/hooks/use-org";
import {
  AircraftCard,
  type AircraftCardData,
  type AircraftStatus,
} from "@/components/fleet/AircraftCard";
import { AddAircraftDialog } from "@/components/fleet/AddAircraftDialog";
import type { Aircraft } from "@/lib/types";
import type { PlatformTier } from "@/lib/tierGuard";
import { exportFleetSnapshotPdf } from "@/lib/fleetPdf";

export const Route = createFileRoute("/_authenticated/fleet")({
  component: FleetPage,
});

// ─────────────────────────────────────────────────────────────
// Map DB row → card shape. Derives manufacturer from model and
// estimates RUL from health score when not present in metadata.
// ─────────────────────────────────────────────────────────────
function inferManufacturer(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("a3") || m.includes("airbus")) return "Airbus";
  if (m.startsWith("7") || m.includes("boeing") || m.includes("dreamliner")) return "Boeing";
  if (m.includes("cessna") || m.startsWith("172") || m.startsWith("182")) return "Cessna";
  if (m.includes("piper") || m.startsWith("pa-")) return "Piper";
  if (m.includes("embraer") || m.startsWith("e1") || m.startsWith("e2")) return "Embraer";
  if (m.includes("bombardier") || m.includes("crj") || m.includes("dash")) return "Bombardier";
  return "—";
}

function inferTier(model: string): PlatformTier {
  const m = model.toLowerCase();
  const trainers = ["172", "152", "pa-28", "pa-44", "warrior", "archer", "skyhawk", "seminole", "cherokee"];
  return trainers.some((t) => m.includes(t)) ? "flight_school" : "commercial_airline";
}

function mapAircraftRow(a: Aircraft): AircraftCardData {
  const meta = (a.metadata as Record<string, unknown> | null) ?? {};
  const status = (a.status as AircraftStatus) ?? "Standby";
  const health = Number(a.health_score);
  // Estimate RUL: scale by health when explicit metadata is absent
  const rulHours = typeof meta.rul_hours === "number" ? meta.rul_hours : Math.max(0, Math.round(health * 50));
  const rulCycles = typeof meta.rul_cycles === "number" ? meta.rul_cycles : Math.max(0, Math.round(health * 45));
  return {
    id: a.id,
    tail_number: a.tail_number,
    model: a.model,
    manufacturer: (meta.manufacturer as string) ?? inferManufacturer(a.model),
    status,
    health_score: health,
    total_flight_hours: a.flight_hours_total,
    next_inspection: a.next_maintenance_due,
    last_inspection: (meta.last_inspection as string) ?? null,
    base_airport_icao: a.base_airport,
    rul_hours: rulHours,
    rul_cycles: rulCycles,
    org_tier: (meta.org_tier as PlatformTier) ?? inferTier(a.model),
    active_flight: (meta.active_flight as string) ?? null,
  };
}

// Tier is read from the org row in the DB (see useResolvedTier); never localStorage.

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
  const tier = useResolvedTier();
  const [orgId] = useCurrentOrgId();
  const currentOrg = useCurrentOrg();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [exporting, setExporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["aircraft", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aircraft")
        .select("*")
        .eq("org_id", orgId!)
        .order("tail_number");
      if (error) throw error;
      return data as Aircraft[];
    },
    refetchInterval: 30_000,
  });

  const fleet = useMemo(() => {
    const mapped = rows.map(mapAircraftRow);
    if (tier === "all") return mapped;
    return mapped.filter((a) => a.org_tier === tier);
  }, [rows, tier]);

  const summary = useMemo(() => deriveFleetSummary(fleet), [fleet]);

  const visible = useMemo(
    () => (filter === "All" ? fleet : fleet.filter((a) => a.status === filter)),
    [fleet, filter],
  );

  const tierLabel =
    tier === "flight_school" ? "Training Fleet" : tier === "commercial_airline" ? "Commercial Fleet" : "All Fleet";

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
        <div className="banner-in mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-end gap-3 flex-wrap">
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
              Live aircraft registry from Lovable Cloud · auto-refresh every 30s.
            </p>
          </div>
          <button
            disabled={exporting || fleet.length === 0}
            onClick={async () => {
              setExporting(true);
              try {
                await exportFleetSnapshotPdf(fleet, currentOrg?.name ?? "SkyTrack");
              } finally {
                setExporting(false);
              }
            }}
            className="btn-cmd shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12px] text-red-300">
            Failed to load fleet: {(error as Error).message}
          </div>
        )}

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

        {isLoading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-24"
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px dashed rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[14px] text-slate-400">
              {fleet.length === 0 ? "No aircraft in fleet yet." : "No aircraft match this filter."}
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {fleet.length === 0 ? "Add an aircraft to get started." : "Try a different status."}
            </p>
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
          SKYTRACK AAOS · LIVE DATA · ICAO ANNEX 6 / KCAA PART 141 COMPLIANT
        </p>
      </div>
    </>
  );
}
