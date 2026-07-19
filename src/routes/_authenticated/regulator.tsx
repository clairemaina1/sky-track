import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { calculateCarbon } from "@/lib/carbonCalculator";
import { Download, FileText, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/regulator")({
  head: pageHead({
    title: "Regulator Export — SkyTrack",
    description: "CORSIA, ICAO Annex 6, and civil aviation authority compliance export bundles.",
    path: "/regulator",
  }),
  component: RegulatorPage,
});

const REPORTS = [
  { id: "corsia", name: "ICAO CORSIA CO₂ Emissions", desc: "Per-flight CO₂ inventory for CORSIA offsetting obligations.", period: "Quarterly" },
  { id: "annex6", name: "ICAO Annex 6 — Flight & Duty", desc: "Crew flight-time and duty-period register.", period: "Monthly" },
  { id: "maint", name: "Continuing Airworthiness Log", desc: "Maintenance actions, MEL entries, AOG events per tail.", period: "Rolling 12m" },
  { id: "fleet", name: "Fleet Register (CAA Form 24)", desc: "Registered aircraft, config, insurance state.", period: "Annual" },
];

function toCSV(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function RegulatorPage() {
  const org = useCurrentOrg();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string) {
    if (!org?.id) { toast.error("Select an organization"); return; }
    setBusy(id);
    try {
      if (id === "corsia") {
        const { data: flights = [] } = await supabase.from("flights").select("*").eq("org_id", org.id);
        const rows = (flights ?? []).map((f) => {
          const fuel = Number(f.fuel_actual_kg ?? f.fuel_planned_kg ?? 0);
          const c = calculateCarbon({ fuelBurnKg: fuel, fuelType: "Jet_A1", safBlendPct: 0 });
          return {
            flight_number: f.flight_number, date: f.scheduled_departure?.slice(0, 10),
            origin: f.origin_iata, destination: f.destination_iata,
            fuel_kg: fuel, co2_kg_gross: c.grossCO2Kg.toFixed(1), co2_kg_net: c.netCO2Kg.toFixed(1),
          };
        });
        download(`corsia_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows));
      } else if (id === "annex6") {
        const { data } = await supabase.from("pilot_logbook_entries").select("*").eq("org_id", org.id);
        download(`annex6_${new Date().toISOString().slice(0,10)}.csv`, toCSV((data ?? []) as Record<string, unknown>[]));
      } else if (id === "maint") {
        const { data } = await supabase.from("maintenance").select("*").eq("org_id", org.id);
        download(`caw_log_${new Date().toISOString().slice(0,10)}.csv`, toCSV((data ?? []) as Record<string, unknown>[]));
      } else if (id === "fleet") {
        const { data } = await supabase.from("aircraft").select("*").eq("org_id", org.id);
        download(`fleet_register_${new Date().toISOString().slice(0,10)}.csv`, toCSV((data ?? []) as Record<string, unknown>[]));
      }
      toast.success("Export ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-accent-fg" />
        <h1 className="font-display text-2xl uppercase tracking-[0.14em]">Regulator Export</h1>
      </div>
      <p className="text-sm text-secondary-fg mb-8">
        One-click compliance bundles for ICAO, your national CAA, and CORSIA verifiers. All exports are RLS-scoped to <span className="text-primary-fg">{org?.name ?? "your organization"}</span>.
      </p>

      <div className="grid gap-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="p-4 border flex items-center gap-4" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
            <FileText className="w-8 h-8 text-secondary-fg shrink-0" />
            <div className="flex-1">
              <div className="font-display text-base">{r.name}</div>
              <div className="text-xs text-secondary-fg">{r.desc}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg mt-1">Cadence: {r.period}</div>
            </div>
            <button
              onClick={() => run(r.id)}
              disabled={busy === r.id}
              className="px-3 py-2 border font-display text-xs uppercase tracking-wider flex items-center gap-2"
              style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}
            >
              <Download className="w-3.5 h-3.5" /> {busy === r.id ? "Building…" : "Export CSV"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 border text-xs text-secondary-fg" style={{ borderColor: "var(--border-subtle)" }}>
        Need a signed PDF or direct filing hook (e.g. CORSIA CERT, KCAA e-file)? Contact <a className="text-accent-fg underline" href="mailto:compliance@skytrack.aero">compliance@skytrack.aero</a> to enable.
      </div>
    </div>
  );
}
