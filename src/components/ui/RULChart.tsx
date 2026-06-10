import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import type { Aircraft } from "@/lib/types";

/**
 * Remaining-Useful-Life projection.
 * Heuristic: health decays linearly at degradation_rate per day,
 * with an envelope of stochastic noise based on cycles-since-overhaul.
 */
export function RULChart({ aircraft }: { aircraft: Aircraft }) {
  const h0 = Number(aircraft.health_score);
  const rate = Number((aircraft as unknown as { degradation_rate?: number }).degradation_rate ?? 0.6);
  const days = 30;

  const series = Array.from({ length: days + 1 }, (_, d) => {
    const projected = Math.max(0, h0 - rate * d);
    const noise = Math.min(4, d * 0.18);
    return {
      day: `D+${d}`,
      health: Number(projected.toFixed(1)),
      lower: Math.max(0, projected - noise),
      upper: Math.min(100, projected + noise),
    };
  });

  const crossesAt = series.findIndex((p) => p.health <= 70);
  const crossesCritical = series.findIndex((p) => p.health <= 30);

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display uppercase text-xs tracking-wider text-secondary-fg">
          RUL · {aircraft.tail_number}
        </div>
        <div className="font-mono text-[10px] text-secondary-fg">
          {crossesAt > 0 && <span style={{ color: "var(--status-amber)" }}>SVC in D+{crossesAt} · </span>}
          {crossesCritical > 0 && <span style={{ color: "var(--status-red)" }}>CRIT in D+{crossesCritical}</span>}
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rulFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} interval={4} />
            <YAxis domain={[0, 100]} tick={{ fill: "var(--text-secondary)", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} width={32} />
            <ReferenceLine y={70} stroke="var(--status-amber)" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={30} stroke="var(--status-red)" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", fontFamily: "JetBrains Mono", fontSize: 11 }}
              labelStyle={{ color: "var(--text-secondary)" }}
            />
            <Area type="monotone" dataKey="health" stroke="var(--accent-primary)" strokeWidth={1.5} fill="url(#rulFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
