import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface HealthGaugeProps {
  /** 0–100 predictive health score */
  score: number;
  /** Remaining useful life in flight hours */
  rulHours?: number | null;
  /** Remaining useful life in cycles */
  rulCycles?: number | null;
  /** Render size in pixels — controls the SVG viewport */
  size?: number;
  /** Suppress the animated draw-in on first render */
  disableAnimation?: boolean;
}

interface ThresholdConfig {
  strokeColor: string;
  glowColor: string;
  trackColor: string;
  labelColor: string;
  riskLabel: string;
  bgAccent: string;
}

function resolveThreshold(score: number): ThresholdConfig {
  if (score >= 90) {
    return {
      strokeColor: "#10b981",
      glowColor: "rgba(16,185,129,0.35)",
      trackColor: "rgba(16,185,129,0.08)",
      labelColor: "#34d399",
      riskLabel: "Optimal",
      bgAccent: "rgba(16,185,129,0.04)",
    };
  }
  if (score >= 70) {
    return {
      strokeColor: "#f59e0b",
      glowColor: "rgba(245,158,11,0.35)",
      trackColor: "rgba(245,158,11,0.08)",
      labelColor: "#fbbf24",
      riskLabel: "Advisory",
      bgAccent: "rgba(245,158,11,0.04)",
    };
  }
  return {
    strokeColor: "#ef4444",
    glowColor: "rgba(239,68,68,0.35)",
    trackColor: "rgba(239,68,68,0.08)",
    labelColor: "#f87171",
    riskLabel: "AOG Risk",
    bgAccent: "rgba(239,68,68,0.04)",
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngleDeg));
  const y1 = cy + r * Math.sin(toRad(startAngleDeg));
  const x2 = cx + r * Math.cos(toRad(endAngleDeg));
  const y2 = cy + r * Math.sin(toRad(endAngleDeg));
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

interface TickLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isMajor: boolean;
}

function buildTicks(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  count: number,
): TickLine[] {
  const ticks: TickLine[] = [];
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const step = (endAngle - startAngle) / (count - 1);

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * step;
    const rad = toRad(angle);
    const isMajor = i % 5 === 0;
    const outer = r;
    const inner = r - (isMajor ? 8 : 4);

    ticks.push({
      x1: cx + outer * Math.cos(rad),
      y1: cy + outer * Math.sin(rad),
      x2: cx + inner * Math.cos(rad),
      y2: cy + inner * Math.sin(rad),
      isMajor,
    });
  }
  return ticks;
}

function formatHours(hours: number): string {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return String(Math.round(hours));
}

export function HealthGauge({
  score,
  rulHours,
  rulCycles,
  size = 140,
  disableAnimation = false,
}: HealthGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const config = resolveThreshold(clampedScore);

  const [displayScore, setDisplayScore] = useState<number>(
    disableAnimation ? clampedScore : 0,
  );
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (disableAnimation) {
      setDisplayScore(clampedScore);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const from = 0;
    const to = clampedScore;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clampedScore, disableAnimation]);

  const cx = size / 2;
  const cy = size / 2 + size * 0.06;
  const radius = size * 0.36;
  const strokeWidth = size * 0.055;
  const trackWidth = strokeWidth * 0.5;

  const ARC_START = 135;
  const ARC_END = 405;
  const ARC_SWEEP = ARC_END - ARC_START;

  const scoreAngle = ARC_START + (clampedScore / 100) * ARC_SWEEP;
  const displayAngle = ARC_START + (displayScore / 100) * ARC_SWEEP;

  const trackPath = describeArc(cx, cy, radius, ARC_START, ARC_END);
  const scorePath =
    displayScore > 0
      ? describeArc(cx, cy, radius, ARC_START, Math.min(displayAngle, ARC_END))
      : "";

  const needleRad = ((scoreAngle - 90) * Math.PI) / 180;
  const needleX = cx + radius * Math.cos(needleRad);
  const needleY = cy + radius * Math.sin(needleRad);

  const ticks = buildTicks(cx, cy, radius + strokeWidth * 0.9, ARC_START, ARC_END, 21);
  const uid = `hg-${Math.abs(score * 100) | 0}`;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: size, height: size + 28 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Health score ${clampedScore} out of 100 — ${config.riskLabel}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient
            id={`${uid}-grad`}
            gradientUnits="userSpaceOnUse"
            x1={cx - radius}
            y1={cy}
            x2={cx + radius}
            y2={cy}
          >
            <stop offset="0%" stopColor={config.strokeColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={config.strokeColor} stopOpacity="1" />
          </linearGradient>
          <radialGradient id={`${uid}-bg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.strokeColor} stopOpacity="0.07" />
            <stop offset="100%" stopColor={config.strokeColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={radius * 1.35} fill={`url(#${uid}-bg)`} />
        <circle
          cx={cx}
          cy={cy}
          r={radius + strokeWidth * 1.4}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
        />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isMajor ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"}
            strokeWidth={t.isMajor ? 1.2 : 0.8}
            strokeLinecap="round"
          />
        ))}
        <path
          d={trackPath}
          fill="none"
          stroke={config.trackColor}
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />
        {scorePath && (
          <path
            d={scorePath}
            fill="none"
            stroke={`url(#${uid}-grad)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#${uid}-glow)`}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={radius - strokeWidth * 0.5}
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={strokeWidth * 0.6}
        />
        {scorePath && (
          <>
            <circle
              cx={needleX}
              cy={needleY}
              r={strokeWidth * 0.55}
              fill={config.strokeColor}
              filter={`url(#${uid}-glow)`}
            />
            <circle
              cx={needleX}
              cy={needleY}
              r={strokeWidth * 0.28}
              fill="white"
              opacity="0.9"
            />
          </>
        )}
        <text
          x={cx}
          y={cy - size * 0.02}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={config.labelColor}
          fontSize={size * 0.23}
          fontWeight="600"
          fontFamily="'DM Sans', 'Helvetica Neue', sans-serif"
          letterSpacing="-0.5"
        >
          {displayScore}
        </text>
        <text
          x={cx + size * 0.155}
          y={cy - size * 0.07}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={config.labelColor}
          fontSize={size * 0.09}
          fontWeight="500"
          fontFamily="'DM Sans', 'Helvetica Neue', sans-serif"
          opacity="0.7"
        >
          %
        </text>
        <text
          x={cx}
          y={cy + size * 0.13}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={config.labelColor}
          fontSize={size * 0.075}
          fontWeight="500"
          fontFamily="'DM Sans', 'Helvetica Neue', sans-serif"
          opacity="0.65"
          letterSpacing="1.5"
        >
          {config.riskLabel.toUpperCase()}
        </text>
        <text
          x={cx - radius * 0.77}
          y={cy + radius * 0.72}
          textAnchor="middle"
          fill="rgba(255,255,255,0.18)"
          fontSize={size * 0.065}
          fontFamily="'JetBrains Mono', monospace"
        >
          0
        </text>
        <text
          x={cx + radius * 0.77}
          y={cy + radius * 0.72}
          textAnchor="middle"
          fill="rgba(255,255,255,0.18)"
          fontSize={size * 0.065}
          fontFamily="'JetBrains Mono', monospace"
        >
          100
        </text>
      </svg>

      <div
        className="mt-1 flex items-center justify-center gap-3"
        style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
      >
        {rulHours != null && (
          <div className="flex flex-col items-center gap-px">
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: config.labelColor, opacity: 0.85 }}
            >
              {formatHours(rulHours)}h
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.12em] text-slate-500 leading-none">
              RUL
            </span>
          </div>
        )}
        {rulHours != null && rulCycles != null && (
          <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        )}
        {rulCycles != null && (
          <div className="flex flex-col items-center gap-px">
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: config.labelColor, opacity: 0.85 }}
            >
              {rulCycles}cy
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.12em] text-slate-500 leading-none">
              Cycles
            </span>
          </div>
        )}
        {rulHours == null && rulCycles == null && (
          <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
            RUL pending
          </span>
        )}
      </div>
    </div>
  );
}
