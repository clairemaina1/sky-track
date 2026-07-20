import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import { generateRecoveryPlan, type RecoveryPlan } from "@/lib/disruptionRecovery.functions";

const ACTION_TONE: Record<string, string> = {
  Aircraft_Swap: "#38bdf8",
  Crew_Reallocation: "#a78bfa",
  Route_Divert: "#f59e0b",
  Delay_Accept: "#64748b",
  Cancellation: "#ef4444",
  Charter_Substitute: "#10b981",
  Wet_Lease: "#10b981",
  Pax_Reprotection: "#3DD9FF",
};

export function AIRecoveryAssistant() {
  const run = useServerFn(generateRecoveryPlan);
  const [disruption, setDisruption] = useState(
    "Convective weather cell over HKJK, 90 min runway closure forecast.",
  );
  const [pax, setPax] = useState(180);
  const [flights, setFlights] = useState(3);
  const [station, setStation] = useState("HKJK");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const result = await run({
        data: {
          disruption,
          affectedFlights: flights,
          paxImpacted: pax,
          station,
        },
      });
      setPlan(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const severityColor =
    plan && plan.severity >= 4
      ? "var(--status-red)"
      : plan && plan.severity >= 3
      ? "var(--status-amber)"
      : "var(--status-green)";

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          AI Recovery Assistant
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-4">
          <Label>Disruption Description</Label>
          <textarea
            value={disruption}
            onChange={(e) => setDisruption(e.target.value)}
            rows={2}
            className="w-full mt-1 px-2 py-1.5 text-sm"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <NumInput label="Station ICAO" value={station} onChange={setStation} mono />
        <NumInput
          label="Affected Flights"
          value={String(flights)}
          onChange={(v) => setFlights(Math.max(0, Number(v) || 0))}
          mono
        />
        <NumInput
          label="Pax Impacted"
          value={String(pax)}
          onChange={(v) => setPax(Math.max(0, Number(v) || 0))}
          mono
        />
        <div className="flex items-end">
          <button
            onClick={generate}
            disabled={loading}
            className="w-full px-3 py-2 font-display uppercase text-[11px] tracking-[0.14em] inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #6366f1)",
              color: "white",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Generate Plan
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-3 py-2 text-xs font-mono flex items-start gap-2"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--status-red)",
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div
            className="p-3"
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid ${severityColor}55`,
              borderLeft: `3px solid ${severityColor}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-display uppercase text-[10px] tracking-[0.14em] text-secondary-fg">
                Executive Summary · Severity {plan.severity}/5
              </div>
            </div>
            <div className="text-sm">{plan.summary}</div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {plan.options.map((o, i) => {
              const tone = ACTION_TONE[o.actionType] ?? "#3DD9FF";
              return (
                <div
                  key={i}
                  className="panel p-3 space-y-2"
                  style={{ borderLeft: `3px solid ${tone}` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5"
                      style={{ background: `${tone}22`, color: tone }}
                    >
                      {o.actionType.replaceAll("_", " ")}
                    </span>
                    <span className="font-mono text-[10px] text-secondary-fg">
                      {Math.round(o.confidence * 100)}%
                    </span>
                  </div>
                  <div className="font-display font-semibold text-sm">{o.title}</div>
                  <div className="text-xs text-secondary-fg">{o.summary}</div>
                  <ol className="space-y-1 mt-2">
                    {o.steps.map((s, si) => (
                      <li key={si} className="flex items-start gap-1.5 text-xs">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: tone }} />
                        <span className="text-secondary-fg">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <div
                    className="flex items-center justify-between pt-2 mt-2 font-mono text-[10px]"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    <span className="text-secondary-fg">
                      Δ delay: <span style={{ color: "#10b981" }}>−{o.delayReductionMin}m</span>
                    </span>
                    <span className="text-secondary-fg">
                      Est: ${o.estimatedCostUsd.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {plan.caveats?.length > 0 && (
            <div
              className="p-3 text-xs"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <div className="font-display uppercase text-[10px] tracking-wider text-amber-400 mb-1">
                Regulatory & Operational Caveats
              </div>
              <ul className="space-y-1 text-secondary-fg list-disc pl-4">
                {plan.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">
      {children}
    </label>
  );
}

function NumInput({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full px-2 py-1.5 text-sm ${mono ? "font-mono" : ""}`}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}
