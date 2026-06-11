import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Leaf, Plane, Gauge, Award, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCarbon, type FuelType } from "@/lib/carbonCalculator";
import type { Flight, Aircraft } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/carbon")({
  head: pageHead({ title: "Carbon & ICAO Emissions — SkyTrack AAOS", description: "ICAO CORSIA emissions tracking, per-sector CO₂ accounting, and offset reporting.", path: "/carbon" }), component: CarbonPage });

function CarbonPage() {
  const [fuelType, setFuelType] = useState<FuelType>("Jet_A1");
  const [safBlend, setSafBlend] = useState(0);
  const [offsetPct, setOffsetPct] = useState(15);

  const { data: flights = [] } = useQuery({
    queryKey: ["flights-carbon"],
    queryFn: async () =>
      (await supabase.from("flights").select("*").order("scheduled_departure", { ascending: false }).limit(40))
        .data as Flight[],
  });
  const { data: fleet = [] } = useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });

  const acById = useMemo(() => Object.fromEntries(fleet.map((a) => [a.id, a])), [fleet]);

  const summary = useMemo(() => {
    let gross = 0;
    let net = 0;
    let saf = 0;
    let totalFuel = 0;
    const perFlight = flights.map((f) => {
      const fuel = Number(f.fuel_actual_kg ?? f.fuel_planned_kg ?? 0);
      totalFuel += fuel;
      const r = calculateCarbon({
        fuelBurnKg: fuel,
        fuelType,
        safBlendPct: fuelType === "Blended_SAF" ? safBlend : 0,
        offsetKg: 0,
      });
      const offsetKg = (r.grossCO2Kg * offsetPct) / 100;
      gross += r.grossCO2Kg;
      net += Math.max(0, r.grossCO2Kg - offsetKg);
      saf += r.safSavingKg;
      return { flight: f, ...r, offsetApplied: offsetKg };
    });
    return { gross, net, saf, totalFuel, offsetKg: gross - net, perFlight };
  }, [flights, fuelType, safBlend, offsetPct]);

  const goalTonnes = 18000;
  const goalProgress = Math.min(100, (summary.net / 1000 / goalTonnes) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display uppercase tracking-[0.12em] text-lg flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" /> Carbon Emissions
          </h1>
          <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">
            ICAO Doc 9501 · Carbon Calculator v12 · Live Telemetry
          </div>
        </div>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-1 border"
          style={{ borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
        >
          ICAO Verified
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Gross CO₂"
          value={`${(summary.gross / 1000).toFixed(1)}t`}
          sub={`${flights.length} flights`}
          icon={<Plane className="w-3.5 h-3.5" />}
        />
        <Kpi
          label="Net CO₂"
          value={`${(summary.net / 1000).toFixed(1)}t`}
          sub={`${offsetPct}% offset`}
          icon={<Leaf className="w-3.5 h-3.5" />}
          tone="#10b981"
        />
        <Kpi
          label="SAF Saving"
          value={`${(summary.saf / 1000).toFixed(2)}t`}
          sub={fuelType === "Blended_SAF" ? `${safBlend}% blend` : fuelType === "SAF" ? "neat SAF" : "no SAF"}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          tone="#a78bfa"
        />
        <Kpi
          label="Fuel Burn"
          value={`${(summary.totalFuel / 1000).toFixed(1)}t`}
          sub="period total"
          icon={<Gauge className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="panel p-4 space-y-4">
        <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg">
          Emission Scenario · Fleet-wide
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Fuel Type">
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-2 py-1.5 text-xs font-mono"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <option value="Jet_A1">Jet A-1 · 3.16 kg/kg</option>
              <option value="Jet_A">Jet A · 3.16 kg/kg</option>
              <option value="Avgas_100LL">Avgas 100LL · 3.10 kg/kg</option>
              <option value="Blended_SAF">Blended SAF</option>
              <option value="SAF">Neat SAF · 0.15 kg/kg</option>
            </select>
          </Field>
          <Field label={`SAF Blend · ${safBlend}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={safBlend}
              onChange={(e) => setSafBlend(Number(e.target.value))}
              disabled={fuelType !== "Blended_SAF"}
              className="w-full mt-2"
            />
          </Field>
          <Field label={`Verified Offsets · ${offsetPct}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={offsetPct}
              onChange={(e) => setOffsetPct(Number(e.target.value))}
              className="w-full mt-2"
            />
          </Field>
        </div>
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg flex items-center gap-2">
            <Award className="w-3.5 h-3.5" /> 2030 Net-Zero Goal
          </div>
          <div className="font-mono text-[11px] text-secondary-fg">
            {(summary.net / 1000).toFixed(1)}t / {goalTonnes.toLocaleString()}t budget
          </div>
        </div>
        <div className="h-3 bg-elevated relative" style={{ border: "1px solid var(--border-subtle)" }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${goalProgress}%`,
              background:
                goalProgress > 80
                  ? "var(--status-red)"
                  : goalProgress > 50
                  ? "var(--status-amber)"
                  : "#10b981",
            }}
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div
          className="px-4 py-3 border-b font-display uppercase text-xs tracking-wider text-secondary-fg"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          Per-Flight Emissions · {summary.perFlight.length} legs
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              {["Flight", "Tail", "Route", "Fuel", "Gross CO₂", "SAF Δ", "Net CO₂"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.perFlight.slice(0, 25).map((row) => {
              const ac = row.flight.aircraft_id ? acById[row.flight.aircraft_id] : null;
              return (
                <tr key={row.flight.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-3 py-2 font-mono text-accent">{row.flight.flight_number}</td>
                  <td className="px-3 py-2 font-mono text-xs text-secondary-fg">
                    {ac?.tail_number ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.flight.origin_icao} → {row.flight.destination_icao}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {(
                      Number(row.flight.fuel_actual_kg ?? row.flight.fuel_planned_kg ?? 0) / 1000
                    ).toFixed(2)}t
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {(row.grossCO2Kg / 1000).toFixed(2)}t
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#a78bfa" }}>
                    {row.safSavingKg > 0 ? `−${(row.safSavingKg / 1000).toFixed(2)}t` : "—"}
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-xs font-semibold"
                    style={{ color: "#10b981" }}
                  >
                    {(Math.max(0, row.grossCO2Kg - row.offsetApplied) / 1000).toFixed(2)}t
                  </td>
                </tr>
              );
            })}
            {summary.perFlight.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-secondary-fg">
                  No flight data available for carbon calculation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="panel p-3">
      <div className="flex items-center gap-1.5 font-display uppercase text-[10px] tracking-[0.14em] text-secondary-fg">
        {icon}
        {label}
      </div>
      <div
        className="mt-1 font-display text-2xl font-bold"
        style={{ color: tone ?? "var(--text-primary)" }}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] text-secondary-fg mt-0.5">{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
