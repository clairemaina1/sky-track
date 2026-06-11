// RULGauge — Remaining Useful Life segmented gauge.
// Distinct from HealthGauge: communicates "countdown to action".

export interface RULGaugeProps {
  remainingHours: number;
  baselineHours: number;
  remainingCycles?: number | null;
  baselineCycles?: number | null;
  ataChapter?: string | null;
  partName: string;
  compact?: boolean;
}

function pct(remaining: number, baseline: number) {
  if (baseline <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((remaining / baseline) * 100)));
}

function resolveColour(percentage: number) {
  if (percentage > 40)
    return { fill: "#10b981", bg: "rgba(16,185,129,0.06)", label: "Serviceable" };
  if (percentage > 15)
    return { fill: "#f59e0b", bg: "rgba(245,158,11,0.07)", label: "Plan Replacement" };
  return { fill: "#ef4444", bg: "rgba(239,68,68,0.07)", label: "Replace Soon" };
}

function formatHours(h: number) {
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k h` : `${Math.round(h)} h`;
}

function Track({
  percentage,
  fill,
  segments = 20,
}: {
  percentage: number;
  fill: string;
  segments?: number;
}) {
  const filled = Math.round((percentage / 100) * segments);
  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < filled;
        const opacity = on
          ? Math.max(0.4, 1 - ((filled - 1 - i) / Math.max(filled, 1)) * 0.55)
          : 1;
        return (
          <div
            key={i}
            className="flex-1 transition-all duration-300"
            style={{
              height: 6,
              background: on ? fill : "rgba(255,255,255,0.05)",
              opacity,
              boxShadow: on && i === filled - 1 ? `0 0 8px ${fill}aa` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export function RULGauge({
  remainingHours,
  baselineHours,
  remainingCycles,
  baselineCycles,
  ataChapter,
  partName,
  compact = false,
}: RULGaugeProps) {
  const hoursPct = pct(remainingHours, baselineHours);
  const cyclesPct =
    remainingCycles != null && baselineCycles != null
      ? pct(remainingCycles, baselineCycles)
      : null;
  const activePct = cyclesPct != null ? Math.min(hoursPct, cyclesPct) : hoursPct;
  const colour = resolveColour(activePct);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-secondary-fg">
            RUL
          </span>
          <span className="font-mono text-[10px] font-semibold" style={{ color: colour.fill }}>
            {formatHours(remainingHours)}
          </span>
        </div>
        <Track percentage={hoursPct} fill={colour.fill} segments={16} />
      </div>
    );
  }

  return (
    <div
      className="p-4 space-y-3"
      style={{ background: colour.bg, border: `1px solid ${colour.fill}33`, borderRadius: 2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-semibold truncate text-primary-fg">
            {partName}
          </p>
          {ataChapter && (
            <p className="font-mono text-[9px] text-secondary-fg">ATA {ataChapter}</p>
          )}
        </div>
        <span
          className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 border"
          style={{ color: colour.fill, borderColor: `${colour.fill}55` }}
        >
          {colour.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-secondary-fg">
            Remaining Hours
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[15px] font-semibold" style={{ color: colour.fill }}>
              {formatHours(remainingHours)}
            </span>
            <span className="font-mono text-[9px] text-secondary-fg">
              / {formatHours(baselineHours)}
            </span>
          </div>
        </div>
        <Track percentage={hoursPct} fill={colour.fill} />
        <div className="flex justify-between font-mono text-[8.5px] text-secondary-fg">
          <span>0</span>
          <span>{hoursPct}% remaining</span>
          <span>{formatHours(baselineHours)}</span>
        </div>
      </div>

      {cyclesPct != null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-secondary-fg">
              Remaining Cycles
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className="font-display text-[15px] font-semibold"
                style={{ color: resolveColour(cyclesPct).fill }}
              >
                {(remainingCycles ?? 0).toLocaleString()}cy
              </span>
              <span className="font-mono text-[9px] text-secondary-fg">
                / {(baselineCycles ?? 0).toLocaleString()}cy
              </span>
            </div>
          </div>
          <Track percentage={cyclesPct} fill={resolveColour(cyclesPct).fill} />
        </div>
      )}
    </div>
  );
}
