import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HealthBar } from "@/components/ui/HealthBar";
import { airportLabel } from "@/lib/types";
import type { Aircraft } from "@/lib/types";
import { declareAOG } from "@/lib/eventEngine";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/fleet")({ component: FleetPage });

function useAircraft() {
  return useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aircraft").select("*").order("tail_number");
      if (error) throw error;
      return data as Aircraft[];
    },
  });
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="panel p-4 flex-1">
      <div className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{label}</div>
      <div className="font-display font-bold text-3xl mt-1" style={{ color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function FleetPage() {
  const { data: fleet = [], isLoading } = useAircraft();
  const [selected, setSelected] = useState<Aircraft | null>(null);

  const stats = {
    total: fleet.length,
    flying: fleet.filter((a) => a.status === "In-Flight").length,
    aog: fleet.filter((a) => a.status === "AOG").length,
    maint: fleet.filter((a) => a.status === "Maintenance").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display uppercase tracking-[0.12em] text-lg">Fleet Operations</h1>
      </div>
      <div className="flex gap-3">
        <Kpi label="Total Fleet" value={stats.total} />
        <Kpi label="In-Flight" value={stats.flying} color="var(--status-blue)" />
        <Kpi label="AOG" value={stats.aog} color="var(--status-red)" />
        <Kpi label="In Maintenance" value={stats.maint} color="var(--status-amber)" />
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              {["Tail #", "Model", "Airline", "Base", "Location", "Status", "Health", "Hrs"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-4 text-secondary-fg text-xs">Loading fleet…</td></tr>}
            {fleet.map((a) => {
              const isAog = a.status === "AOG";
              return (
                <tr key={a.id}
                  onClick={() => setSelected(a)}
                  className={"cursor-pointer transition-colors hover:bg-[var(--bg-elevated)] " + (isAog ? "row-aog" : "")}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td className="px-3 py-2 font-mono text-accent">{a.tail_number}</td>
                  <td className="px-3 py-2">{a.model}</td>
                  <td className="px-3 py-2 text-secondary-fg">{a.airline}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.base_airport}</td>
                  <td className="px-3 py-2 font-mono text-xs">{airportLabel(a.current_airport)}</td>
                  <td className="px-3 py-2"><StatusBadge status={a.status} pulse={isAog} /></td>
                  <td className="px-3 py-2"><HealthBar value={Number(a.health_score)} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-secondary-fg">{a.flight_hours_total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <DetailPanel aircraft={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailPanel({ aircraft, onClose }: { aircraft: Aircraft; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-[420px] panel overflow-auto p-4"
        style={{ borderLeft: "1px solid var(--border-active)", borderRadius: 0 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-accent text-xl">{aircraft.tail_number}</div>
            <div className="text-xs text-secondary-fg">{aircraft.model} · {aircraft.airline}</div>
          </div>
          <button onClick={onClose} className="btn-cmd-ghost">Close</button>
        </div>
        <StatusBadge status={aircraft.status} pulse={aircraft.status === "AOG"} />
        <dl className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <Field label="Base" value={aircraft.base_airport} mono />
          <Field label="Location" value={aircraft.current_airport ?? "—"} mono />
          <Field label="Health" value={`${Number(aircraft.health_score).toFixed(1)}%`} mono />
          <Field label="Total Hrs" value={aircraft.flight_hours_total.toLocaleString()} mono />
          <Field label="Fuel" value={`${Number(aircraft.current_fuel_kg ?? 0).toLocaleString()} / ${Number(aircraft.fuel_capacity_kg ?? 0).toLocaleString()} kg`} mono />
          <Field label="Next Maint" value={aircraft.next_maintenance_due?.slice(0, 10) ?? "—"} mono />
        </dl>
        <div className="mt-6 flex gap-2">
          <button
            disabled={aircraft.status === "AOG" || busy}
            onClick={async () => { setBusy(true); await declareAOG(aircraft.id); setBusy(false); onClose(); }}
            className="btn-cmd-danger flex-1 justify-center"
          >
            {busy ? "Declaring…" : "Declare AOG"}
          </button>
          <Link to="/mro" className="btn-cmd flex-1 justify-center">View MRO</Link>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-display uppercase text-[10px] tracking-wider text-secondary-fg">{label}</dt>
      <dd className={mono ? "font-mono mt-0.5" : "mt-0.5"}>{value}</dd>
    </div>
  );
}
