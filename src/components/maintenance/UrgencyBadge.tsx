// Urgency badge — maps work-order priority to a colour-coded chip.
// Schema priority values are free text; we normalise common ones.
export type WorkOrderUrgency = "Routine" | "Watch" | "Advisory" | "Critical" | "AOG";

const URGENCY_MAP: Record<
  WorkOrderUrgency,
  { tone: string; bg: string; pulse: boolean; severity: number }
> = {
  Routine:  { tone: "#94a3b8", bg: "rgba(148,163,184,0.08)", pulse: false, severity: 1 },
  Watch:    { tone: "#38bdf8", bg: "rgba(56,189,248,0.08)",  pulse: false, severity: 2 },
  Advisory: { tone: "#f59e0b", bg: "rgba(245,158,11,0.08)",  pulse: false, severity: 3 },
  Critical: { tone: "#fb923c", bg: "rgba(251,146,60,0.10)",  pulse: true,  severity: 4 },
  AOG:      { tone: "#ef4444", bg: "rgba(239,68,68,0.12)",   pulse: true,  severity: 5 },
};

export function normaliseUrgency(priority: string | null | undefined): WorkOrderUrgency {
  const p = (priority ?? "").toLowerCase();
  if (p.includes("aog")) return "AOG";
  if (p.includes("crit") || p === "high") return "Critical";
  if (p.includes("advis") || p === "medium") return "Advisory";
  if (p.includes("watch") || p === "low") return "Watch";
  return "Routine";
}

export function getUrgencySeverity(u: WorkOrderUrgency): number {
  return URGENCY_MAP[u].severity;
}

export function UrgencyBadge({
  urgency,
  large = false,
}: {
  urgency: WorkOrderUrgency;
  large?: boolean;
}) {
  const cfg = URGENCY_MAP[urgency];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.tone}55`,
        padding: large ? "4px 10px" : "2px 7px",
        borderRadius: 2,
      }}
    >
      <span className="relative flex" style={{ width: 7, height: 7 }}>
        {cfg.pulse && (
          <span
            className="absolute inline-flex h-full w-full rounded-full pulse-dot"
            style={{ background: cfg.tone, color: cfg.tone, opacity: 0.7 }}
          />
        )}
        <span
          className="relative inline-flex rounded-full"
          style={{ width: 7, height: 7, background: cfg.tone }}
        />
      </span>
      <span
        className="font-display font-bold uppercase tracking-[0.14em]"
        style={{ color: cfg.tone, fontSize: large ? 11 : 9 }}
      >
        {urgency}
      </span>
    </span>
  );
}
