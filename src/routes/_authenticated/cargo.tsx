import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Cargo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cargo")({ component: CargoPage });

const HANDLING_COLOR: Record<string, string> = {
  DANGEROUS_GOODS: "var(--status-red)",
  PERISHABLE: "var(--status-amber)",
  LIVE_ANIMAL: "var(--status-green)",
};

function CargoPage() {
  const { data: items = [] } = useQuery({
    queryKey: ["cargo"],
    queryFn: async () => (await supabase.from("cargo").select("*").order("awb_number")).data as Cargo[],
  });
  const stats = {
    total: items.length,
    transit: items.filter((c) => c.status === "In-Transit").length,
    delayed: items.filter((c) => c.status === "Delayed").length,
    customs: items.filter((c) => c.status === "Held-Customs").length,
  };
  return (
    <div className="space-y-4">
      <h1 className="font-display uppercase tracking-[0.12em] text-lg">Cargo Operations</h1>
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Total", stats.total],
          ["In-Transit", stats.transit],
          ["Delayed", stats.delayed],
          ["Held Customs", stats.customs],
        ].map(([l, v]) => (
          <div key={l as string} className="panel p-4">
            <div className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{l}</div>
            <div className="font-display font-bold text-3xl mt-1">{v}</div>
          </div>
        ))}
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {["AWB #", "Route", "Shipper → Consignee", "Weight", "Commodity", "Handling", "Status"].map(h => (
              <th key={h} className="text-left px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((c) => {
              const isDelayed = c.status === "Delayed";
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)", background: isDelayed ? "rgba(245,158,11,0.06)" : undefined }}>
                  <td className="px-3 py-2 font-mono text-accent">{c.awb_number}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.origin_icao} → {c.destination_icao}</td>
                  <td className="px-3 py-2 text-xs">{c.shipper} → {c.consignee}</td>
                  <td className="px-3 py-2 font-mono text-xs">{Number(c.weight_kg).toLocaleString()} kg</td>
                  <td className="px-3 py-2 text-xs text-secondary-fg">{c.commodity_type}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.special_handling.map((t) => (
                        <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 border" style={{ color: HANDLING_COLOR[t] ?? "var(--text-secondary)", borderColor: "currentColor" }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
