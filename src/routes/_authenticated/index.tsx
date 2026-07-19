import { pageHead } from "@/lib/routeHead";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Aircraft, Alert } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/")({
  head: pageHead({ title: "Command Center — SkyTrack AAOS", description: "SkyTrack AAOS command center: live overview of fleet, flights, maintenance, crew, and disruptions.", path: "/" }), component: CommandCenter });

function CommandCenter() {
  const { data: fleet = [] } = useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () =>
      (await supabase.from("alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }).limit(8)).data as Alert[],
  });

  const stats = {
    total: fleet.length,
    flying: fleet.filter((a) => a.status === "In-Flight").length,
    aog: fleet.filter((a) => a.status === "AOG").length,
    avgHealth: fleet.length ? fleet.reduce((s, a) => s + Number(a.health_score), 0) / fleet.length : 0,
  };

  const tiles = [
    { to: "/fleet", label: "Fleet", value: `${stats.total} TAILS`, sub: `${stats.flying} airborne` },
    { to: "/mro", label: "Fleet Health", value: `${stats.avgHealth.toFixed(1)}%`, sub: `avg score` },
    { to: "/disruption", label: "Active Alerts", value: `${alerts.length}`, sub: "unacknowledged" },
    { to: "/cargo", label: "Operations", value: stats.aog > 0 ? "AOG" : "NOMINAL", sub: stats.aog > 0 ? `${stats.aog} grounded` : "all systems go" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase tracking-[0.12em] text-lg">Command Center</h1>
        <p className="text-sm text-secondary-fg mt-1">
          Flight delay mitigation · Asset utilization · Compliance-ready carbon reporting.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="panel p-4 hover:bg-[var(--bg-elevated)] transition">
            <div className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{t.label}</div>
            <div className="font-display font-bold text-2xl mt-1 text-accent">{t.value}</div>
            <div className="text-xs text-secondary-fg mt-0.5">{t.sub}</div>
          </Link>
        ))}
      </div>
      <div className="panel p-4">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">Recent Alerts</div>
        <ul className="space-y-2">
          {alerts.length === 0 && <li className="text-xs text-muted-fg">No active alerts.</li>}
          {alerts.map((a) => (
            <li key={a.id} className="text-xs flex items-center gap-3">
              <span className="font-mono px-2 py-0.5" style={{ color: a.severity === "Critical" ? "var(--status-red)" : "var(--status-amber)", borderLeft: "2px solid currentColor" }}>{a.severity}</span>
              <span className="font-display font-semibold">{a.title}</span>
              <span className="text-secondary-fg truncate">{a.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
