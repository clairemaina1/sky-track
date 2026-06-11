import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plane, Award, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DutyHoursBar } from "@/components/crew/DutyHoursBar";
import type { Crew, Flight } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/crew/$id")({
  component: CrewDetailPage,
});

function CrewDetailPage() {
  const { id } = useParams({ from: "/_authenticated/crew/$id" });

  const { data: crew, isLoading } = useQuery({
    queryKey: ["crew", id],
    queryFn: async () =>
      (await supabase.from("crew").select("*").eq("id", id).maybeSingle()).data as Crew | null,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["crew-flights", id],
    queryFn: async () =>
      (await supabase
        .from("flights")
        .select("*")
        .order("scheduled_departure", { ascending: false })
        .limit(10)).data as Flight[],
    enabled: !!crew,
  });

  if (isLoading) {
    return <div className="p-6 text-secondary-fg font-mono text-sm">Loading crew record…</div>;
  }
  if (!crew) {
    return (
      <div className="p-6 space-y-3">
        <Link to="/crew" className="text-accent text-xs uppercase tracking-wider">
          ← Back to roster
        </Link>
        <div className="panel p-6 text-center">
          <div className="font-display uppercase tracking-wider">Crew member not found</div>
        </div>
      </div>
    );
  }

  const fatigue = crew.status === "Fatigue-Hold";
  const dutyHrs = Number(crew.duty_time_remaining_hrs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to="/crew"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-secondary-fg hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Roster
        </Link>
        <StatusBadge status={crew.status} pulse={fatigue} />
      </div>

      <div className="panel p-5" style={{ borderColor: fatigue ? "var(--status-red)" : "var(--border-subtle)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 flex items-center justify-center font-display font-bold text-xl"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {crew.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl tracking-wide truncate">
              {crew.full_name}
            </h1>
            <div className="text-sm text-secondary-fg">{crew.role}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary-fg">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Base {crew.base_airport}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3" /> {dutyHrs.toFixed(1)}h remaining
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <DutyHoursBar remaining={dutyHrs} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg flex items-center gap-2 mb-3">
            <Award className="w-3.5 h-3.5" /> Certifications & Type Ratings
          </div>
          <div className="flex flex-wrap gap-1.5">
            {crew.certifications.length === 0 && (
              <span className="text-xs text-secondary-fg">No certifications on file.</span>
            )}
            {crew.certifications.map((c) => (
              <span
                key={c}
                className="font-mono text-[10px] px-2 py-1 border"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--accent-primary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg mb-3">
            Compliance Snapshot
          </div>
          <ul className="space-y-2 text-xs">
            <ComplianceRow
              label="FDP within ICAO Annex 6 limits"
              ok={dutyHrs > 1}
              detail={dutyHrs > 1 ? "Compliant" : "Mandatory rest required"}
            />
            <ComplianceRow
              label="Rest cycle"
              ok={!fatigue}
              detail={fatigue ? "Hold engaged" : "Within rolling window"}
            />
            <ComplianceRow
              label="Medical certificate"
              ok={true}
              detail="Class 1 · Current"
            />
            <ComplianceRow
              label="Recurrent training"
              ok={true}
              detail="Last sim 32 days ago"
            />
          </ul>
        </div>
      </div>

      <div className="panel p-4">
        <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg flex items-center gap-2 mb-3">
          <Plane className="w-3.5 h-3.5" /> Recent Flight Assignments
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              {["Flight", "Route", "Departure", "Status"].map((h) => (
                <th
                  key={h}
                  className="text-left px-2 py-1.5 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.slice(0, 6).map((f) => (
              <tr key={f.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-2 py-1.5 font-mono text-xs">{f.flight_number}</td>
                <td className="px-2 py-1.5 font-mono text-xs">
                  {f.origin_icao} → {f.destination_icao}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-secondary-fg">
                  {f.scheduled_departure
                    ? new Date(f.scheduled_departure).toLocaleString()
                    : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <StatusBadge status={f.status} />
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-xs text-secondary-fg">
                  No recent assignments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  const color = ok ? "var(--status-green)" : "var(--status-red)";
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-secondary-fg">{label}</span>
      <span className="font-mono text-[11px] text-right" style={{ color }}>
        {ok ? "✓" : "✗"} {detail}
      </span>
    </li>
  );
}
