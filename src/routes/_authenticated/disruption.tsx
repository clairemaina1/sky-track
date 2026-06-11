import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AIRecoveryAssistant } from "@/components/ai/AIRecoveryAssistant";
import { useAlertStore } from "@/stores/alertStore";
import type { Alert } from "@/lib/types";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/disruption")({
  head: pageHead({ title: "Disruption Management — SkyTrack AAOS", description: "Live disruption console: weather, slot, crew, and technical events with AI recovery options.", path: "/disruption" }), component: DisruptionPage });

function DisruptionPage() {
  const ackLocal = useAlertStore((s) => s.acknowledge);
  const { data: alerts = [], refetch } = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: async () =>
      (await supabase.from("alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false })).data as Alert[],
  });
  const [pax, setPax] = useState(120);

  async function ack(id: string) {
    await supabase.from("alerts").update({ acknowledged: true }).eq("id", id);
    ackLocal(id);
    refetch();
  }

  const tier = (h: number) => h < 2 ? { label: "Meal voucher", kes: 500 } : h < 4 ? { label: "Meal + lounge", kes: 2000 } : { label: "Meal + hotel + rebook", kes: 8000 };
  const compTier = tier(3);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase tracking-[0.12em] text-lg">
          Disruption Recovery Centre
        </h1>
        <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">
          IRROPS · AI-Augmented Decision Support · ICAO Annex 6 Aware
        </div>
      </div>

      <AIRecoveryAssistant />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="panel p-4 lg:col-span-2">
          <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">Active Disruptions</div>
          <ul className="space-y-2">
            {alerts.length === 0 && <li className="text-xs text-muted-fg">No active disruptions.</li>}
            {alerts.map((a) => (
              <li key={a.id} className="panel-elevated p-3">
                <div className="flex items-start gap-3">
                  <StatusBadge status={a.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold">{a.title}</div>
                    <div className="text-xs text-secondary-fg mt-0.5">{a.body}</div>
                    <div className="text-[10px] font-mono text-muted-fg mt-1">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {a.type}
                    </div>
                  </div>
                  <button onClick={() => ack(a.id)} className="btn-cmd-ghost">Ack</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4">
          <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">Compensation</div>
          <label className="text-xs text-secondary-fg">Passenger count</label>
          <input type="number" value={pax} onChange={(e) => setPax(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 bg-surface border font-mono text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <div className="mt-3 text-sm">
            <div className="text-secondary-fg text-xs">Estimated tier (3hr delay)</div>
            <div className="font-display font-semibold mt-1">{compTier.label}</div>
            <div className="font-mono text-xl text-accent mt-1">KES {(compTier.kes * pax).toLocaleString()}</div>
          </div>
          <button
            onClick={() => {
              const text = `SkyTrack Compensation\nPassengers: ${pax}\nTier: ${compTier.label}\nTotal: KES ${(compTier.kes * pax).toLocaleString()}`;
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "compensation.txt"; a.click();
            }}
            className="btn-cmd w-full justify-center mt-3">Generate letters</button>
        </div>
      </div>

      <div className="panel p-4">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">Alternative Routes (HKJK → HTDA)</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { id: "A", label: "Direct (baseline)", fuel: 9200, time: "1h 30m", saved: 0 },
            { id: "B", label: "Via alternate waypoint", fuel: 8740, time: "1h 50m", saved: 460 },
            { id: "C", label: "Altitude-optimized", fuel: 8096, time: "2h 05m", saved: 1104, recommended: true },
          ].map((o) => (
            <div key={o.id} className="panel-elevated p-3" style={{ borderColor: o.recommended ? "var(--accent-primary)" : "var(--border-subtle)" }}>
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold">Option {o.id}</span>
                {o.recommended && <span className="text-[10px] font-display uppercase tracking-wider text-accent">● Recommended</span>}
              </div>
              <div className="text-xs text-secondary-fg mt-1">{o.label}</div>
              <div className="font-mono text-sm mt-2">{o.fuel.toLocaleString()} kg · {o.time}</div>
              {o.saved > 0 && <div className="font-mono text-xs mt-1" style={{ color: "var(--status-green)" }}>−{o.saved} kg saved</div>}
              <button className="btn-cmd w-full justify-center mt-3">Select</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
