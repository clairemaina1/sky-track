import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RULChart } from "@/components/ui/RULChart";
import type { Maintenance, Aircraft } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/mro")({ component: MROPage });

function MROPage() {
  const { data: wos = [] } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => (await supabase.from("maintenance").select("*").order("opened_at", { ascending: false })).data as Maintenance[],
  });
  const { data: fleet = [] } = useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });
  const sorted = [...fleet].sort((a, b) => Number(a.health_score) - Number(b.health_score));

  return (
    <div className="space-y-4">
      <h1 className="font-display uppercase tracking-[0.12em] text-lg">MRO · Maintenance Operations</h1>
      <div className="panel p-4">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">Fleet Health</div>
        <div className="space-y-2">
          {sorted.map((a) => {
            const v = Number(a.health_score);
            const color = v < 30 ? "var(--status-red)" : v < 70 ? "var(--status-amber)" : "var(--status-green)";
            return (
              <div key={a.id} className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent w-20">{a.tail_number}</span>
                <div className="flex-1 h-4 bg-elevated relative" style={{ border: "1px solid var(--border-subtle)" }}>
                  <div className="h-full" style={{ width: `${v}%`, background: color }} />
                  <div className="absolute top-0 bottom-0" style={{ left: "80%", width: 1, background: "var(--text-secondary)", opacity: 0.4 }} />
                </div>
                <span className="font-mono text-xs w-12 text-right" style={{ color }}>{v.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sorted.slice(0, 4).map((a) => <RULChart key={a.id} aircraft={a} />)}
      </div>

      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b font-display uppercase text-xs tracking-wider text-secondary-fg" style={{ borderColor: "var(--border-subtle)" }}>Work Orders</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {["WO #", "Title", "Priority", "Status", "Trigger", "Team", "Hrs"].map(h => (
              <th key={h} className="text-left px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {wos.map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-3 py-2 font-mono text-accent">{w.work_order_number}</td>
                <td className="px-3 py-2">{w.title}</td>
                <td className="px-3 py-2"><StatusBadge status={w.priority} /></td>
                <td className="px-3 py-2"><StatusBadge status={w.status} /></td>
                <td className="px-3 py-2 font-mono text-xs text-secondary-fg">{w.triggered_by === "AOG-Event" || w.triggered_by === "Predictive" ? "⚡ " : ""}{w.triggered_by}</td>
                <td className="px-3 py-2 text-xs text-secondary-fg">{w.assigned_team ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{w.estimated_hours ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
