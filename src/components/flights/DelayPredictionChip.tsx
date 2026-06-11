export interface DelayPredictionChipProps {
  predictedDelayMin: number;
  confidenceScore: number;
  compact?: boolean;
}

interface ChipConfig {
  label: string;
  sublabel: string;
  bgStyle: string;
  borderStyle: string;
  textClass: string;
  dotClass: string;
  pulse: boolean;
  barFill: string;
}

function resolveChipConfig(delayMin: number, confidence: number): ChipConfig {
  if (delayMin < 5) {
    return {
      label: "On Time",
      sublabel: `${Math.round(confidence * 100)}% conf.`,
      bgStyle: "rgba(16,185,129,0.07)",
      borderStyle: "rgba(16,185,129,0.18)",
      textClass: "text-emerald-400",
      dotClass: "bg-emerald-400",
      pulse: false,
      barFill: "#10b981",
    };
  }
  if (delayMin < 30) {
    return {
      label: `+${delayMin}m`,
      sublabel: "At Risk",
      bgStyle: "rgba(245,158,11,0.07)",
      borderStyle: "rgba(245,158,11,0.2)",
      textClass: "text-amber-400",
      dotClass: "bg-amber-400",
      pulse: true,
      barFill: "#f59e0b",
    };
  }
  return {
    label: `+${delayMin}m`,
    sublabel: "Delayed",
    bgStyle: "rgba(239,68,68,0.07)",
    borderStyle: "rgba(239,68,68,0.22)",
    textClass: "text-red-400",
    dotClass: "bg-red-500",
    pulse: true,
    barFill: "#ef4444",
  };
}

function AISparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function DelayPredictionChip({
  predictedDelayMin,
  confidenceScore,
  compact = false,
}: DelayPredictionChipProps) {
  const cfg = resolveChipConfig(predictedDelayMin, confidenceScore);
  const confPct = Math.round(confidenceScore * 100);

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 rounded-md border px-1.5 py-0.5"
        style={{ background: cfg.bgStyle, borderColor: cfg.borderStyle }}
        title={`AI Delay Prediction: ${cfg.label} — ${confPct}% confidence`}
      >
        <AISparkIcon className={`h-2.5 w-2.5 ${cfg.textClass}`} />
        <span
          className={`text-[9px] font-bold ${cfg.textClass}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {cfg.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border px-3 py-2"
      style={{ background: cfg.bgStyle, borderColor: cfg.borderStyle, minWidth: "88px" }}
    >
      <div className="flex items-center gap-1.5">
        <AISparkIcon className={`h-3 w-3 shrink-0 ${cfg.textClass}`} />
        <span
          className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${cfg.textClass}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          AI Predict
        </span>
        {cfg.pulse && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${cfg.dotClass}`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dotClass}`}
            />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-[16px] font-semibold leading-none ${cfg.textClass}`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {cfg.label}
        </span>
        <span
          className={`text-[9px] ${cfg.textClass} opacity-70`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {cfg.sublabel}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${confPct}%`, background: cfg.barFill, opacity: 0.7 }}
          />
        </div>
        <span className="text-[8.5px] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {confPct}% confidence
        </span>
      </div>
    </div>
  );
}
