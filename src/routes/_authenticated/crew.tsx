import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CrewMatcher } from "@/components/ui/CrewMatcher";
import type { Crew } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/crew")({ component: CrewPage });

function DutyGauge({ hours }: { hours: number }) {
  const v = Math.max(0, Math.min(8, hours));
  const pct = v / 8;
  const color = v < 2 ? "var(--status-red)" : v < 4 ? "var(--status-amber)" : "var(--status-green)";
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fill={color} fontFamily="JetBrains Mono">
        {v.toFixed(1)}h
      </text>
    </svg>
  );
}

function CrewPage() {
  const { data: crew = [] } = useQuery({
    queryKey: ["crew"],
    queryFn: async () => (await supabase.from("crew").select("*").order("full_name")).data as Crew[],
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display uppercase tracking-[0.12em] text-lg">Crew Roster</h1>
      <CrewMatcher crew={crew} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {crew.map((c) => {
          const fatigue = c.status === "Fatigue-Hold";
          const initials = c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          return (
            <div key={c.id} className="panel p-3" style={{ borderColor: fatigue ? "var(--status-red)" : "var(--border-subtle)" }}>
              {fatigue && <div className="text-[10px] font-display uppercase tracking-wider text-center py-1 mb-2" style={{ background: "var(--status-red)", color: "white" }}>Fatigue Hold</div>}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center font-display font-bold text-sm" style={{ background: "var(--bg-elevated)", color: "var(--accent-primary)" }}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold truncate">{c.full_name}</div>
                  <div className="text-xs text-secondary-fg truncate">{c.role}</div>
                </div>
                <DutyGauge hours={Number(c.duty_time_remaining_hrs)} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <StatusBadge status={c.status} />
                <span className="font-mono text-[10px] text-secondary-fg">{c.base_airport}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.certifications.map((t) => (
                  <span key={t} className="font-mono text-[9px] px-1.5 py-0.5" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
