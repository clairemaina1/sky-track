import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/_authenticated/fuel-burn")({
  head: pageHead({
    title: "Fuel-Burn Heatmap — SkyTrack AAOS",
    description: "Per-tail and per-route fuel efficiency. Spot the worst offenders your CFO wants trimmed.",
    path: "/fuel-burn",
  }),
  component: FuelBurnPage,
});

type Row = {
  id: string;
  origin_icao: string | null;
  destination_icao: string | null;
  fuel_planned_kg: number | null;
  fuel_actual_kg: number | null;
  actual_departure: string | null;
  actual_arrival: string | null;
  aircraft: { tail_number: string; model: string | null } | null;
};

function heat(v: number, min: number, max: number): string {
  if (max === min) return "hsl(140 60% 40% / 0.25)";
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  // green → amber → red
  const hue = 140 - t * 140;
  const alpha = 0.18 + t * 0.55;
  return `hsl(${hue} 78% 48% / ${alpha})`;
}

function FuelBurnPage() {
  const [mode, setMode] = useState<"tail" | "route">("tail");

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["fuel-burn"],
    queryFn: async () => {
      const { data } = await supabase
        .from("flights")
        .select("id, origin_icao, destination_icao, fuel_planned_kg, fuel_actual_kg, actual_departure, actual_arrival, aircraft(tail_number, model)")
        .not("fuel_actual_kg", "is", null)
        .order("actual_departure", { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, { key: string; label: string; sublabel: string; flights: number; totalKg: number; avgKg: number; variancePct: number; kgPerHr: number }>();
    for (const f of flights) {
      const key = mode === "tail"
        ? f.aircraft?.tail_number ?? "—"
        : `${f.origin_icao ?? "?"} → ${f.destination_icao ?? "?"}`;
      const label = key;
      const sublabel = mode === "tail" ? (f.aircraft?.model ?? "") : "";
      const actual = Number(f.fuel_actual_kg ?? 0);
      const planned = Number(f.fuel_planned_kg ?? 0);
      const blockMin = f.actual_departure && f.actual_arrival
        ? Math.max(15, (new Date(f.actual_arrival).getTime() - new Date(f.actual_departure).getTime()) / 60000)
        : 90;
      const cur = map.get(key) ?? { key, label, sublabel, flights: 0, totalKg: 0, avgKg: 0, variancePct: 0, kgPerHr: 0 };
      cur.flights += 1;
      cur.totalKg += actual;
      cur.kgPerHr += (actual / (blockMin / 60));
      cur.variancePct += planned > 0 ? ((actual - planned) / planned) * 100 : 0;
      map.set(key, cur);
    }
    const out = Array.from(map.values()).map((r) => ({
      ...r,
      avgKg: r.totalKg / r.flights,
      kgPerHr: r.kgPerHr / r.flights,
      variancePct: r.variancePct / r.flights,
    }));
    out.sort((a, b) => b.kgPerHr - a.kgPerHr);
    return out;
  }, [flights, mode]);

  const { min, max } = useMemo(() => {
    if (rows.length === 0) return { min: 0, max: 1 };
    const vals = rows.map((r) => r.kgPerHr);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rows]);

  const totalKg = rows.reduce((s, r) => s + r.totalKg, 0);
  const worst = rows[0];

  return (
    <div className="space-y-4 px-2 py-4 sm:px-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary-fg flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" /> Fuel-Burn Heatmap
          </h1>
          <p className="mt-1 text-xs text-secondary-fg max-w-2xl">
            Kilograms burned per block-hour, aggregated from actual fuel logs. Red = inefficient, green = efficient.
            {worst && ` Biggest offender: ${worst.label} at ${Math.round(worst.kgPerHr).toLocaleString()} kg/hr.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-white/10 p-0.5 flex">
            {(["tail", "route"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1 text-[11px] uppercase tracking-wider rounded"
                style={{
                  background: mode === m ? "var(--accent-primary)" : "transparent",
                  color: mode === m ? "#000" : "var(--text-secondary)",
                }}
              >
                By {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Flights analyzed" value={flights.length.toString()} />
        <StatCard label="Total burn (t)" value={(totalKg / 1000).toFixed(1)} />
        <StatCard label={`${mode === "tail" ? "Tails" : "Routes"}`} value={rows.length.toString()} />
        <StatCard label="Avg kg/hr" value={rows.length ? Math.round(rows.reduce((s, r) => s + r.kgPerHr, 0) / rows.length).toLocaleString() : "0"} />
      </div>

      <section className="rounded-2xl p-4 overflow-x-auto" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading fuel logs…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No completed flights with actual fuel data yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-secondary-fg">
              <tr>
                <th className="py-2 text-left">{mode === "tail" ? "Aircraft" : "Route"}</th>
                <th className="py-2 text-right">Flights</th>
                <th className="py-2 text-right">Avg fuel (kg)</th>
                <th className="py-2 text-right">kg / block-hr</th>
                <th className="py-2 text-right">vs planned</th>
                <th className="py-2 text-left w-1/3">Heat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const variance = r.variancePct;
                return (
                  <tr key={r.key} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="py-2">
                      <div className="font-mono text-slate-200">{r.label}</div>
                      {r.sublabel && <div className="text-[10px] text-slate-500">{r.sublabel}</div>}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">{r.flights}</td>
                    <td className="py-2 text-right font-mono text-slate-300">{Math.round(r.avgKg).toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-slate-200">{Math.round(r.kgPerHr).toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">
                      <span className={variance > 3 ? "text-red-400" : variance < -3 ? "text-emerald-400" : "text-slate-400"}>
                        {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                        {variance > 3 ? <TrendingUp className="inline h-3 w-3 ml-1" /> : variance < -3 ? <TrendingDown className="inline h-3 w-3 ml-1" /> : null}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="h-6 rounded" style={{ background: heat(r.kgPerHr, min, max), width: `${5 + ((r.kgPerHr - min) / Math.max(1, max - min)) * 95}%` }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[10px] text-slate-500 px-1">
        Block-hour = wheels-up to wheels-down. Variance compares actual to dispatcher-planned fuel. Consistent +5% overburn on a tail usually points to engine wash, wing polish, or CG issues.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">{label}</div>
      <div className="mt-1 font-display text-xl text-primary-fg">{value}</div>
    </div>
  );
}
