import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, AlertTriangle, ShieldCheck, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { CrewMatcher } from "@/components/ui/CrewMatcher";
import { CrewCard } from "@/components/crew/CrewCard";
import { AddCrewDialog } from "@/components/crud/AddDialogs";
import type { Crew } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/crew")({ component: CrewPage });

type Filter = "all" | "on-duty" | "available" | "fatigue" | "leave";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on-duty", label: "On Duty" },
  { id: "available", label: "Available" },
  { id: "fatigue", label: "Fatigue Hold" },
  { id: "leave", label: "On Leave" },
];

function CrewPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [orgId] = useCurrentOrgId();

  const { data: crew = [], isLoading } = useQuery({
    queryKey: ["crew", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (await supabase.from("crew").select("*").eq("org_id", orgId!).order("full_name")).data as Crew[],
  });

  const kpis = useMemo(() => {
    const onDuty = crew.filter((c) => c.status === "On-Duty").length;
    const available = crew.filter((c) => c.status === "Off-Duty").length;
    const fatigue = crew.filter((c) => c.status === "Fatigue-Hold").length;
    const avgDuty =
      crew.length === 0
        ? 0
        : crew.reduce((s, c) => s + Number(c.duty_time_remaining_hrs), 0) / crew.length;
    return { total: crew.length, onDuty, available, fatigue, avgDuty };
  }, [crew]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crew
      .filter((c) => {
        if (filter === "on-duty" && c.status !== "On-Duty") return false;
        if (filter === "available" && c.status !== "Off-Duty") return false;
        if (filter === "fatigue" && c.status !== "Fatigue-Hold") return false;
        if (filter === "leave" && c.status !== "On-Leave") return false;
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.full_name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.base_airport.toLowerCase().includes(q) ||
          c.certifications.some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [crew, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display uppercase tracking-[0.12em] text-lg">Crew Roster</h1>
          <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">
            ICAO Annex 6 FDP · Real-Time Fatigue Monitoring
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, role, base, cert…"
            className="px-3 py-1.5 text-xs font-mono w-72 max-w-[50vw]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <button onClick={() => setAddOpen(true)} className="btn-cmd shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
      <AddCrewDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<Users className="w-3.5 h-3.5" />}
          label="Total Crew"
          value={kpis.total.toString()}
        />
        <Kpi
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="On Duty"
          value={kpis.onDuty.toString()}
          tone="var(--status-green)"
        />
        <Kpi
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Fatigue Hold"
          value={kpis.fatigue.toString()}
          tone={kpis.fatigue > 0 ? "var(--status-red)" : undefined}
        />
        <Kpi
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Avg Duty Remaining"
          value={`${kpis.avgDuty.toFixed(1)}h`}
        />
      </div>

      <CrewMatcher crew={crew} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
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
        <span className="ml-auto self-center font-mono text-[10px] text-secondary-fg">
          {filtered.length} of {crew.length}
        </span>
      </div>

      {isLoading ? (
        <div className="panel p-8 text-center text-xs text-secondary-fg font-mono">
          Loading roster…
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-8 text-center text-xs text-secondary-fg">
          No crew match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <CrewCard key={c.id} crew={c} />
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
  value: string;
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
