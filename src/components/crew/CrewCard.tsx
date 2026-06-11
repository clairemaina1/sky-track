import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DutyHoursBar } from "./DutyHoursBar";
import type { Crew } from "@/lib/types";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export function CrewCard({ crew }: { crew: Crew }) {
  const fatigue = crew.status === "Fatigue-Hold";
  const onLeave = crew.status === "On-Leave";
  const accentColor = fatigue
    ? "var(--status-red)"
    : crew.status === "On-Duty"
    ? "var(--status-green)"
    : "var(--border-subtle)";

  return (
    <Link
      to="/crew/$id"
      params={{ id: crew.id }}
      className="panel p-3 block transition-all hover:translate-y-[-1px]"
      style={{
        borderColor: accentColor,
        borderLeftWidth: 3,
        opacity: onLeave ? 0.7 : 1,
      }}
    >
      {fatigue && (
        <div
          className="text-[9px] font-display uppercase tracking-[0.16em] text-center py-1 mb-2"
          style={{ background: "var(--status-red)", color: "white" }}
        >
          ⚠ Mandatory Rest Hold
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 shrink-0 flex items-center justify-center font-display font-bold text-sm"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--accent-primary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {initials(crew.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold truncate">{crew.full_name}</div>
          <div className="text-[11px] text-secondary-fg truncate">{crew.role}</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-secondary-fg mt-0.5">
            Base · {crew.base_airport}
          </div>
        </div>
        <StatusBadge status={crew.status} pulse={fatigue} />
      </div>

      <div className="mt-3">
        <DutyHoursBar remaining={Number(crew.duty_time_remaining_hrs)} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {crew.certifications.slice(0, 6).map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] px-1.5 py-0.5 border"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {t}
          </span>
        ))}
        {crew.certifications.length > 6 && (
          <span className="font-mono text-[9px] text-secondary-fg px-1">
            +{crew.certifications.length - 6}
          </span>
        )}
      </div>
    </Link>
  );
}
