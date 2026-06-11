import { Wrench, Package, Clock, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { UrgencyBadge, normaliseUrgency } from "./UrgencyBadge";
import { RULGauge } from "./RULGauge";
import type { Maintenance, Aircraft } from "@/lib/types";

const STATUS_ICON = {
  Open: Clock,
  "In-Progress": Wrench,
  "Pending-Parts": Package,
  Completed: CheckCircle2,
  Deferred: PauseCircle,
  Cancelled: XCircle,
} as const;

const STATUS_TONE: Record<string, string> = {
  Open: "#38bdf8",
  "In-Progress": "#a78bfa",
  "Pending-Parts": "#f59e0b",
  Completed: "#10b981",
  Deferred: "#64748b",
  Cancelled: "#64748b",
};

export function WorkOrderCard({
  wo,
  aircraft,
}: {
  wo: Maintenance;
  aircraft?: Aircraft;
}) {
  const urgency = normaliseUrgency(wo.priority);
  const Icon = STATUS_ICON[wo.status as keyof typeof STATUS_ICON] ?? Clock;
  const tone = STATUS_TONE[wo.status] ?? "#94a3b8";

  // Derive RUL view from aircraft health when available — visualisation only.
  const health = Number(aircraft?.health_score ?? 80);
  const baselineHours = 5000;
  const remainingHours = Math.round((health / 100) * baselineHours);

  return (
    <div
      className="panel p-4 space-y-3 transition-all hover:translate-y-[-1px]"
      style={{
        borderLeft: `3px solid ${urgency === "AOG" ? "var(--status-red)" : tone}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-accent">{wo.work_order_number}</span>
            <UrgencyBadge urgency={urgency} />
          </div>
          <div className="font-display font-semibold truncate">{wo.title}</div>
          {wo.description && (
            <div className="text-xs text-secondary-fg line-clamp-2 mt-0.5">
              {wo.description}
            </div>
          )}
        </div>
        <div
          className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 border"
          style={{ borderColor: `${tone}55`, color: tone, borderRadius: 2 }}
        >
          <Icon className="w-3 h-3" />
          <span className="font-display uppercase text-[9px] tracking-[0.12em]">
            {wo.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Meta label="Aircraft" value={aircraft?.tail_number ?? "—"} mono />
        <Meta label="Team" value={wo.assigned_team ?? "—"} />
        <Meta
          label="Est / Act"
          value={`${wo.estimated_hours ?? "—"}h / ${wo.actual_hours ?? "—"}h`}
          mono
        />
      </div>

      <RULGauge
        partName={aircraft ? `${aircraft.tail_number} · ${aircraft.model}` : "Component"}
        ataChapter={null}
        remainingHours={remainingHours}
        baselineHours={baselineHours}
        compact
      />

      <div className="flex items-center justify-between font-mono text-[10px] text-secondary-fg">
        <span>
          Trigger:{" "}
          <span style={{ color: wo.triggered_by === "Predictive" ? "var(--accent-primary)" : undefined }}>
            {wo.triggered_by === "Predictive" || wo.triggered_by === "AOG-Event" ? "⚡ " : ""}
            {wo.triggered_by}
          </span>
        </span>
        <span>{new Date(wo.opened_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-display uppercase text-[9px] tracking-wider text-secondary-fg">
        {label}
      </div>
      <div className={mono ? "font-mono text-[11px]" : "text-[11px]"}>{value}</div>
    </div>
  );
}
