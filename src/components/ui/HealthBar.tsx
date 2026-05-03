export function HealthBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v < 30 ? "var(--status-red)" : v < 70 ? "var(--status-amber)" : "var(--status-green)";
  const segments = 10;
  const filled = Math.round((v / 100) * segments);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-3"
            style={{ background: i < filled ? tone : "var(--border-subtle)" }}
          />
        ))}
      </div>
      <span className="font-mono text-xs" style={{ color: tone }}>
        {v.toFixed(0)}%
      </span>
    </div>
  );
}
