import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wrench, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkOrderCard } from "@/components/maintenance/WorkOrderCard";
import { UrgencyBadge, normaliseUrgency, getUrgencySeverity, type WorkOrderUrgency } from "@/components/maintenance/UrgencyBadge";
import { RULChart } from "@/components/ui/RULChart";
import type { Maintenance, Aircraft } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/mro")({ component: MROPage });

type StatusFilter = "all" | "open" | "in-progress" | "parts" | "completed";

const STATUS_FILTERS: { id: StatusFilter; label: string; match?: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open", match: "Open" },
  { id: "in-progress", label: "In Progress", match: "In-Progress" },
  { id: "parts", label: "Pending Parts", match: "Pending-Parts" },
  { id: "completed", label: "Completed", match: "Completed" },
];

function MROPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<WorkOrderUrgency | "all">("all");

  const { data: wos = [] } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () =>
      (await supabase.from("maintenance").select("*").order("opened_at", { ascending: false }))
        .data as Maintenance[],
  });
  const { data: fleet = [] } = useQuery({
    queryKey: ["aircraft"],
    queryFn: async () => (await supabase.from("aircraft").select("*")).data as Aircraft[],
  });

  const aircraftById = useMemo(
    () => Object.fromEntries(fleet.map((a) => [a.id, a])),
    [fleet],
  );

  const kpis = useMemo(() => {
    const open = wos.filter((w) => w.status !== "Completed").length;
    const aog = wos.filter((w) => normaliseUrgency(w.priority) === "AOG").length;
    const critical = wos.filter((w) => normaliseUrgency(w.priority) === "Critical").length;
    const completed = wos.filter((w) => w.status === "Completed").length;
    return { open, aog, critical, completed };
  }, [wos]);

  const filtered = useMemo(() => {
    const f = STATUS_FILTERS.find((s) => s.id === statusFilter);
    return wos
      .filter((w) => (f?.match ? w.status === f.match : true))
      .filter((w) => (urgencyFilter === "all" ? true : normaliseUrgency(w.priority) === urgencyFilter))
      .sort(
        (a, b) =>
          getUrgencySeverity(normaliseUrgency(b.priority)) -
          getUrgencySeverity(normaliseUrgency(a.priority)),
      );
  }, [wos, statusFilter, urgencyFilter]);

  const sortedFleet = [...fleet].sort(
    (a, b) => Number(a.health_score) - Number(b.health_score),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase tracking-[0.12em] text-lg">
          MRO · Maintenance Operations
        </h1>
        <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">
          Predictive Work Orders · RUL Telemetry · ATA-Indexed
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Wrench className="w-3.5 h-3.5" />} label="Open WO" value={kpis.open} />
        <Kpi
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="AOG"
          value={kpis.aog}
          tone={kpis.aog > 0 ? "var(--status-red)" : undefined}
        />
        <Kpi
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Critical"
          value={kpis.critical}
          tone={kpis.critical > 0 ? "var(--status-amber)" : undefined}
        />
        <Kpi
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Completed"
          value={kpis.completed}
          tone="var(--status-green)"
        />
      </div>

      <div className="panel p-4">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg mb-3">
          Fleet Health · Sorted by Risk
        </div>
        <div className="space-y-2">
          {sortedFleet.map((a) => {
            const v = Number(a.health_score);
            const color =
              v < 30 ? "var(--status-red)" : v < 70 ? "var(--status-amber)" : "var(--status-green)";
            return (
              <div key={a.id} className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent w-20">{a.tail_number}</span>
                <div
                  className="flex-1 h-4 bg-elevated relative"
                  style={{ border: "1px solid var(--border-subtle)" }}
                >
                  <div className="h-full" style={{ width: `${v}%`, background: color }} />
                  <div
                    className="absolute top-0 bottom-0"
                    style={{ left: "80%", width: 1, background: "var(--text-secondary)", opacity: 0.4 }}
                  />
                </div>
                <span className="font-mono text-xs w-12 text-right" style={{ color }}>
                  {v.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sortedFleet.slice(0, 2).map((a) => (
          <RULChart key={a.id} aircraft={a} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="px-3 py-1 text-[10px] font-display uppercase tracking-[0.12em] border transition-colors"
              style={{
                background: active ? "var(--accent-primary)" : "transparent",
                color: active ? "var(--bg-void)" : "var(--text-secondary)",
                borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
              }}
            >
              {f.label}
            </button>
          );
        })}
        <span className="mx-2 h-4 w-px" style={{ background: "var(--border-subtle)" }} />
        {(["all", "AOG", "Critical", "Advisory", "Watch", "Routine"] as const).map((u) => {
          const active = urgencyFilter === u;
          return (
            <button
              key={u}
              onClick={() => setUrgencyFilter(u)}
              className="px-2 py-1"
              style={{ opacity: active ? 1 : 0.55 }}
            >
              {u === "all" ? (
                <span className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">
                  Any urgency
                </span>
              ) : (
                <UrgencyBadge urgency={u} />
              )}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[10px] text-secondary-fg">
          {filtered.length} of {wos.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-8 text-center text-xs text-secondary-fg">
          No work orders match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((w) => (
            <WorkOrderCard
              key={w.id}
              wo={w}
              aircraft={w.aircraft_id ? aircraftById[w.aircraft_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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
    </div>
  );
}
