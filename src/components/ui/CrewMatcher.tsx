import { useMemo, useState } from "react";
import type { Crew } from "@/lib/types";

/**
 * Match qualified, rested, available crew to a flight requirement.
 * Score = certification match (40) + duty time remaining (30) + base proximity (20) + status bonus (10).
 */
export function CrewMatcher({ crew }: { crew: Crew[] }) {
  const [role, setRole] = useState<"Captain" | "First-Officer" | "Cabin" | "Engineer">("Captain");
  const [requiredCert, setRequiredCert] = useState("B737");
  const [base, setBase] = useState("HKJK");
  const [minDuty, setMinDuty] = useState(4);

  const ranked = useMemo(() => {
    return crew
      .map((c) => {
        const matchesRole = c.role === role;
        const hasCert = c.certifications.includes(requiredCert);
        const dutyHrs = Number(c.duty_time_remaining_hrs);
        const dutyOK = dutyHrs >= minDuty;
        const available = c.status === "Available";

        const score =
          (hasCert ? 40 : 0) +
          Math.min(30, (dutyHrs / 8) * 30) +
          (c.base_airport === base ? 20 : 0) +
          (available ? 10 : c.status === "On-Duty" ? 5 : 0);

        return { crew: c, score, matchesRole, hasCert, dutyOK, available };
      })
      .filter((r) => r.matchesRole)
      .sort((a, b) => b.score - a.score);
  }, [crew, role, requiredCert, base, minDuty]);

  return (
    <div className="panel p-4 space-y-3">
      <div className="font-display uppercase text-xs tracking-wider text-secondary-fg">
        Crew Matcher · Algorithmic Assignment
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="select-input">
            {["Captain", "First-Officer", "Cabin", "Engineer"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Required Cert">
          <select value={requiredCert} onChange={(e) => setRequiredCert(e.target.value)} className="select-input">
            {["B737", "B787", "Q400", "ATR72", "E190", "B737-MAX"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Base">
          <select value={base} onChange={(e) => setBase(e.target.value)} className="select-input">
            {["HKJK", "HKNW", "HTDA", "HAAB", "HRYR", "HUEN"].map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label={`Min duty (${minDuty}h)`}>
          <input type="range" min={0} max={8} step={0.5} value={minDuty} onChange={(e) => setMinDuty(Number(e.target.value))} className="w-full mt-2" />
        </Field>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {["#", "Crew", "Score", "Cert", "Duty", "Base", "Status"].map((h) => (
              <th key={h} className="text-left px-2 py-1.5 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.slice(0, 8).map((r, i) => (
            <tr key={r.crew.id} style={{ borderBottom: "1px solid var(--border-subtle)", opacity: r.score < 40 ? 0.5 : 1 }}>
              <td className="px-2 py-1.5 font-mono text-xs text-secondary-fg">{i + 1}</td>
              <td className="px-2 py-1.5">{r.crew.full_name}</td>
              <td className="px-2 py-1.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-elevated">
                    <div className="h-full" style={{ width: `${r.score}%`, background: r.score >= 70 ? "var(--status-green)" : r.score >= 40 ? "var(--status-amber)" : "var(--status-red)" }} />
                  </div>
                  <span>{r.score.toFixed(0)}</span>
                </div>
              </td>
              <td className="px-2 py-1.5 font-mono text-xs" style={{ color: r.hasCert ? "var(--status-green)" : "var(--status-red)" }}>{r.hasCert ? "✓" : "✗"}</td>
              <td className="px-2 py-1.5 font-mono text-xs" style={{ color: r.dutyOK ? "var(--status-green)" : "var(--status-red)" }}>{Number(r.crew.duty_time_remaining_hrs).toFixed(1)}h</td>
              <td className="px-2 py-1.5 font-mono text-xs">{r.crew.base_airport}</td>
              <td className="px-2 py-1.5 font-mono text-xs text-secondary-fg">{r.crew.status}</td>
            </tr>
          ))}
          {ranked.length === 0 && (
            <tr><td colSpan={7} className="px-2 py-4 text-center text-xs text-secondary-fg">No crew match this role.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
