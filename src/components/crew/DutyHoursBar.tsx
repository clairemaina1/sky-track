// Duty Hours Bar — ICAO/FAA FDP visualisation (0–8h remaining)
// Color-coded segments to communicate fatigue risk at a glance.
export function DutyHoursBar({
  remaining,
  max = 8,
  showLabel = true,
  compact = false,
}: {
  remaining: number;
  max?: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const v = Math.max(0, Math.min(max, remaining));
  const pct = (v / max) * 100;
  const tone =
    v < 1 ? "var(--status-red)" : v < 3 ? "var(--status-amber)" : "var(--status-green)";
  const segments = compact ? 8 : 16;
  const filled = Math.round((v / max) * segments);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="font-display uppercase text-[9px] tracking-[0.14em] text-secondary-fg">
            Duty Remaining
          </span>
          <span className="font-mono text-[10px]" style={{ color: tone }}>
            {v.toFixed(1)}h / {max}h
          </span>
        </div>
      )}
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 transition-colors"
            style={{
              background: i < filled ? tone : "var(--border-subtle)",
              opacity: i < filled ? 1 : 0.4,
              boxShadow: i < filled ? `0 0 4px ${tone}` : "none",
            }}
          />
        ))}
      </div>
      {showLabel && pct < 20 && (
        <div
          className="font-display uppercase text-[9px] tracking-wider mt-1"
          style={{ color: "var(--status-red)" }}
        >
          ⚠ FDP Near Limit · Rest Required
        </div>
      )}
    </div>
  );
}
