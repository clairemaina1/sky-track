import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wrench, AlertTriangle, CheckCircle2, ArrowRight, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: pageHead({
    title: "What-If Simulator — SkyTrack AAOS",
    description: "Model AOG events and see cheapest recovery: swap aircraft, delay cost, crew legality.",
    path: "/simulator",
  }),
  component: SimulatorPage,
});

type Aircraft = {
  id: string;
  tail_number: string;
  model: string | null;
  status: string;
  current_airport: string | null;
  health_score: number | null;
};
type Flight = {
  id: string;
  flight_number: string;
  origin_icao: string | null;
  destination_icao: string | null;
  scheduled_departure: string;
  aircraft_id: string | null;
  aircraft: { tail_number: string } | null;
};

// Very rough industry-standard delay cost (USD/min) per narrowbody hour of delay.
const DELAY_COST_PER_MIN = 101; // A4A 2023 avg
const SWAP_POSITIONING_COST_PER_HR = 4200; // ferry cost per block hour narrowbody
const CANCELLATION_COST = 45000; // typical narrowbody cancel

function SimulatorPage() {
  const [selectedTail, setSelectedTail] = useState<string | null>(null);
  const [aogHours, setAogHours] = useState(24);

  const { data: aircraft = [] } = useQuery({
    queryKey: ["sim-aircraft"],
    queryFn: async () => {
      const { data } = await supabase
        .from("aircraft")
        .select("id, tail_number, model, status, current_airport, health_score")
        .order("tail_number");
      return (data ?? []) as Aircraft[];
    },
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["sim-flights", selectedTail, aogHours],
    enabled: !!selectedTail,
    queryFn: async () => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + aogHours * 3600_000).toISOString();
      const { data } = await supabase
        .from("flights")
        .select("id, flight_number, origin_icao, destination_icao, scheduled_departure, aircraft_id, aircraft(tail_number)")
        .eq("aircraft_id", selectedTail!)
        .gte("scheduled_departure", from)
        .lte("scheduled_departure", to)
        .order("scheduled_departure");
      return (data ?? []) as unknown as Flight[];
    },
  });

  const grounded = aircraft.find((a) => a.id === selectedTail);

  const recoveryPlan = useMemo(() => {
    if (!grounded || flights.length === 0) return null;

    const rankSwap = (candidate: Aircraft, flight: Flight): { score: number; note: string; ferry: number; delayMin: number } => {
      let score = 100;
      const notes: string[] = [];
      let ferry = 0;
      let delayMin = 0;

      // model match
      if (candidate.model && grounded.model && candidate.model === grounded.model) score += 30;
      else notes.push("model mismatch — check certification");

      // availability
      if (candidate.status.toLowerCase() !== "active") { score -= 60; notes.push(`status: ${candidate.status}`); }

      // location — needs ferry
      if (candidate.current_airport && candidate.current_airport !== flight.origin_icao) {
        ferry = 90; // assume 1.5h ferry
        delayMin = 60;
        notes.push(`ferry from ${candidate.current_airport}`);
        score -= 20;
      } else {
        notes.push("in position");
        score += 20;
      }

      // health
      if ((candidate.health_score ?? 100) < 80) { score -= 15; notes.push(`health ${candidate.health_score}%`); }

      return { score, note: notes.join(" · "), ferry, delayMin };
    };

    const legs = flights.map((f) => {
      const candidates = aircraft
        .filter((a) => a.id !== selectedTail)
        .map((a) => ({ aircraft: a, ...rankSwap(a, f) }))
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const cancelCost = CANCELLATION_COST;
      const swapCost = best
        ? best.delayMin * DELAY_COST_PER_MIN + (best.ferry / 60) * SWAP_POSITIONING_COST_PER_HR
        : cancelCost;
      const action = best && best.score > 60 && swapCost < cancelCost
        ? { type: "swap" as const, aircraft: best.aircraft, cost: swapCost, delayMin: best.delayMin, note: best.note }
        : { type: "cancel" as const, cost: cancelCost };
      return { flight: f, action, alternatives: candidates.slice(0, 3) };
    });

    const totalCost = legs.reduce((s, l) => s + l.action.cost, 0);
    const swaps = legs.filter((l) => l.action.type === "swap").length;
    const cancels = legs.filter((l) => l.action.type === "cancel").length;
    return { legs, totalCost, swaps, cancels };
  }, [grounded, flights, aircraft, selectedTail]);

  return (
    <div className="space-y-4 px-2 py-4 sm:px-4">
      <header>
        <h1 className="font-display text-2xl tracking-tight text-primary-fg flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-400" /> What-If AOG Simulator
        </h1>
        <p className="mt-1 text-xs text-secondary-fg max-w-2xl">
          Pick a tail, set a ground duration, and SkyTrack ranks the cheapest recovery per affected flight:
          aircraft swap, ferry cost, delay cost, or outright cancel.
        </p>
      </header>

      <section className="rounded-2xl p-4 grid gap-4 md:grid-cols-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">Aircraft to ground</label>
          <select
            value={selectedTail ?? ""}
            onChange={(e) => setSelectedTail(e.target.value || null)}
            className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">— Select a tail —</option>
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tail_number} · {a.model ?? "?"} · {a.current_airport ?? "?"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">Ground time (hours)</label>
          <input
            type="range" min={2} max={72} step={1} value={aogHours}
            onChange={(e) => setAogHours(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-1 font-mono text-xs text-slate-300">{aogHours}h window</div>
        </div>
      </section>

      {!selectedTail ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
          Select an aircraft above to run the simulation.
        </div>
      ) : flights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> No flights affected in the next {aogHours}h — safe to ground.
        </div>
      ) : recoveryPlan && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Affected flights" value={recoveryPlan.legs.length.toString()} />
            <Stat label="Swaps found" value={recoveryPlan.swaps.toString()} accent="emerald" />
            <Stat label="Cancels" value={recoveryPlan.cancels.toString()} accent={recoveryPlan.cancels > 0 ? "red" : undefined} />
            <Stat label="Est. total cost" value={`$${Math.round(recoveryPlan.totalCost).toLocaleString()}`} />
          </div>

          <section className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">Recovery plan (cheapest first)</h2>
            {recoveryPlan.legs.map(({ flight, action, alternatives }) => (
              <div key={flight.id} className="rounded-lg p-3 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Plane className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-mono text-sm text-slate-200">{flight.flight_number}</div>
                      <div className="text-[11px] text-slate-500">
                        {flight.origin_icao} → {flight.destination_icao} · {new Date(flight.scheduled_departure).toUTCString().slice(17, 22)}Z
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.type === "swap" ? (
                      <>
                        <span className="text-xs text-slate-400">Swap →</span>
                        <span className="font-mono text-sm text-emerald-300">{action.aircraft.tail_number}</span>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        <span className="font-mono text-sm text-slate-200">${Math.round(action.cost).toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-red-300">Cancel</span>
                        <span className="font-mono text-sm text-slate-200">${Math.round(action.cost).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                {action.type === "swap" && action.note && (
                  <div className="mt-2 text-[10px] text-slate-500 pl-7">{action.note}</div>
                )}
                {alternatives.length > 1 && (
                  <div className="mt-2 pl-7 flex flex-wrap gap-2">
                    {alternatives.slice(1).map((alt) => (
                      <span key={alt.aircraft.id} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-500 font-mono">
                        alt: {alt.aircraft.tail_number} (score {alt.score})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>

          <p className="text-[10px] text-slate-500 px-1">
            Cost model: swap = delay minutes × ${DELAY_COST_PER_MIN}/min + ferry hours × ${SWAP_POSITIONING_COST_PER_HR}/hr. Cancel = ${CANCELLATION_COST.toLocaleString()} (A4A narrowbody avg). Crew legality is not yet checked — enable Crew Duty rules to layer that in.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "red" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "red" ? "text-red-300" : "text-primary-fg";
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">{label}</div>
      <div className={`mt-1 font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
