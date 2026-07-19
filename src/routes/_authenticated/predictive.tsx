import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, TrendingDown, Wrench } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/predictive")({
  head: pageHead({
    title: "Predictive Maintenance — SkyTrack",
    description: "Per-tail health scoring, MTBUR trends, and predictive AOG risk based on maintenance history and utilisation.",
    path: "/predictive",
  }),
  component: PredictivePage,
});

type Aircraft = {
  id: string; tail_number: string; model: string; status: string;
  health_score: number; flight_hours_total: number;
  next_maintenance_due: string | null; base_airport: string;
};
type Maint = {
  id: string; aircraft_id: string | null; status: string; priority: string;
  triggered_by: string; opened_at: string; completed_at: string | null; title: string;
};

type Risk = {
  ac: Aircraft;
  score: number;           // 0-100 predicted health (lower = riskier)
  aogRiskPct: number;      // predicted AOG within 30d
  openWO: number;
  cyclesSinceMaint: number;
  daysToNextMaint: number | null;
  mtbur: number | null;    // mean time between unscheduled removals (hrs)
  drivers: string[];
};

// Deterministic pseudo-ML: weighted heuristics over available signals.
// A trained model would replace scoreAircraft() without changing the UI.
function scoreAircraft(ac: Aircraft, wos: Maint[]): Risk {
  const openWO = wos.filter((w) => w.status !== "Completed" && w.status !== "Closed").length;
  const unscheduled = wos.filter((w) => /unschedul|aog|defect/i.test(w.triggered_by + " " + w.title));
  const now = Date.now();
  const daysToNextMaint = ac.next_maintenance_due
    ? Math.round((new Date(ac.next_maintenance_due).getTime() - now) / 86400_000)
    : null;

  // Rough MTBUR from last 12 unscheduled removals
  const sorted = unscheduled.map((w) => new Date(w.opened_at).getTime()).sort();
  let mtbur: number | null = null;
  if (sorted.length >= 2) {
    const spans = sorted.slice(1).map((t, i) => t - sorted[i]);
    const avgMs = spans.reduce((a, b) => a + b, 0) / spans.length;
    mtbur = Math.round(avgMs / 3600_000); // hours between events
  }

  const drivers: string[] = [];
  let penalty = 0;

  if (openWO >= 3) { penalty += 18; drivers.push(`${openWO} open work orders`); }
  else if (openWO === 2) { penalty += 8; drivers.push("2 open work orders"); }

  if (daysToNextMaint !== null) {
    if (daysToNextMaint < 0) { penalty += 25; drivers.push(`Overdue maintenance by ${Math.abs(daysToNextMaint)}d`); }
    else if (daysToNextMaint <= 7) { penalty += 12; drivers.push(`Maintenance due in ${daysToNextMaint}d`); }
  }

  if (ac.flight_hours_total > 8000) { penalty += 10; drivers.push("High airframe hours (>8k)"); }
  else if (ac.flight_hours_total > 4000) { penalty += 5; }

  if (unscheduled.length >= 3) { penalty += 12; drivers.push(`${unscheduled.length} unscheduled events in log`); }

  if (ac.status === "AOG") { penalty += 40; drivers.push("Currently AOG"); }
  if (ac.status === "In-Maintenance") { penalty += 15; drivers.push("In maintenance"); }

  const baseline = Number(ac.health_score ?? 100);
  const score = Math.max(0, Math.min(100, Math.round(baseline - penalty)));
  const aogRiskPct = Math.min(95, Math.round((100 - score) * 0.9));

  if (drivers.length === 0) drivers.push("Stable — no anomalies detected");

  return {
    ac, score, aogRiskPct, openWO,
    cyclesSinceMaint: unscheduled.length,
    daysToNextMaint, mtbur,
    drivers,
  };
}

function riskBand(score: number) {
  if (score >= 80) return { label: "Healthy", color: "#00C2A8" };
  if (score >= 60) return { label: "Watch", color: "#F5B301" };
  if (score >= 40) return { label: "Elevated", color: "#F97316" };
  return { label: "Critical", color: "#EF4444" };
}

function PredictivePage() {
  const { data: fleet = [] } = useQuery({
    queryKey: ["predictive-fleet"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });
  const { data: wos = [] } = useQuery({
    queryKey: ["predictive-wos"],
    queryFn: async () =>
      (await supabase.from("maintenance").select("*").order("opened_at", { ascending: false }).limit(500))
        .data as Maint[],
  });

  const risks: Risk[] = fleet
    .map((ac) => scoreAircraft(ac, wos.filter((w) => w.aircraft_id === ac.id)))
    .sort((a, b) => a.score - b.score);

  const critical = risks.filter((r) => r.score < 60).length;
  const avgScore = risks.length ? Math.round(risks.reduce((a, r) => a + r.score, 0) / risks.length) : 100;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Activity className="w-6 h-6 text-accent-fg" />
        <h1 className="font-display text-2xl uppercase tracking-[0.14em]">Predictive Maintenance</h1>
      </div>
      <p className="text-sm text-secondary-fg mb-6">
        Per-tail health scoring and 30-day AOG risk from utilisation, open work orders, and unscheduled-removal history.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Fleet health" value={`${avgScore}`} suffix="/100" tone={avgScore >= 80 ? "good" : avgScore >= 60 ? "warn" : "bad"} />
        <Stat label="Tails at risk" value={String(critical)} suffix={` / ${risks.length}`} tone={critical === 0 ? "good" : critical <= 2 ? "warn" : "bad"} />
        <Stat label="Open work orders" value={String(wos.filter((w) => w.status !== "Completed" && w.status !== "Closed").length)} tone="neutral" />
      </div>

      <div className="border" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="grid grid-cols-[1fr_120px_120px_120px_2fr] px-4 py-2 border-b font-mono text-[10px] uppercase tracking-wider text-secondary-fg" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <div>Tail / Model</div>
          <div>Health</div>
          <div>30d AOG risk</div>
          <div>Next maint</div>
          <div>Drivers</div>
        </div>
        {risks.length === 0 && (
          <div className="p-8 text-center text-secondary-fg text-sm">No aircraft yet. Add tails on the Fleet page.</div>
        )}
        {risks.map((r) => {
          const band = riskBand(r.score);
          return (
            <Link
              key={r.ac.id}
              to="/fleet/$id"
              params={{ id: r.ac.id }}
              className="grid grid-cols-[1fr_120px_120px_120px_2fr] px-4 py-3 border-t items-center hover:bg-[var(--bg-elevated)]"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div>
                <div className="font-display text-sm">{r.ac.tail_number}</div>
                <div className="font-mono text-[10px] text-secondary-fg">{r.ac.model}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-full h-1.5 rounded" style={{ background: "var(--border-subtle)" }}>
                  <div className="h-full rounded" style={{ width: `${r.score}%`, background: band.color }} />
                </div>
                <div className="font-mono text-xs w-8 text-right" style={{ color: band.color }}>{r.score}</div>
              </div>
              <div className="font-mono text-xs" style={{ color: band.color }}>
                {r.aogRiskPct}%
              </div>
              <div className="font-mono text-[11px] text-secondary-fg">
                {r.daysToNextMaint === null ? "—" : r.daysToNextMaint < 0 ? `${Math.abs(r.daysToNextMaint)}d overdue` : `${r.daysToNextMaint}d`}
              </div>
              <div className="flex flex-wrap gap-1">
                {r.drivers.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 border" style={{ borderColor: band.color, color: band.color }}>
                    {d}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 p-4 border text-xs text-secondary-fg flex gap-3" style={{ borderColor: "var(--border-subtle)" }}>
        <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          Scores use a transparent heuristic (open WO count, cycles since last inspection, days-to-next-maint, unscheduled-removal frequency, hours-on-airframe). Swap in a trained model without changing this UI — the ranking and drivers stay the same shape.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const color = tone === "good" ? "#00C2A8" : tone === "warn" ? "#F5B301" : tone === "bad" ? "#EF4444" : "var(--text-primary)";
  return (
    <div className="p-4 border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">{label}</div>
      <div className="font-display text-2xl mt-1" style={{ color }}>
        {value}{suffix && <span className="font-mono text-xs text-secondary-fg ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

// unused import guard
void AlertTriangle; void Wrench;
