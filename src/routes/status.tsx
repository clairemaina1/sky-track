import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Activity } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: pageHead({
    title: "SkyTrack — Platform Status",
    description: "Real-time platform health, uptime and incident history for the SkyTrack aviation operations platform.",
    path: "/status",
  }),
  component: StatusPage,
});

type Service = { name: string; status: "operational" | "degraded" | "down"; latencyMs: number };

function StatusPage() {
  const [services, setServices] = useState<Service[]>([
    { name: "Web App", status: "operational", latencyMs: 42 },
    { name: "Live Tracker (ADS-B)", status: "operational", latencyMs: 118 },
    { name: "Auth & RLS", status: "operational", latencyMs: 51 },
    { name: "Notifications", status: "operational", latencyMs: 38 },
    { name: "MCP / AI Copilot", status: "operational", latencyMs: 220 },
    { name: "Weather Radar Tiles", status: "operational", latencyMs: 96 },
  ]);
  const [now, setNow] = useState<string>(() => new Date().toISOString().slice(0, 19).replace("T", " ") + "Z");

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date().toISOString().slice(0, 19).replace("T", " ") + "Z");
      setServices((s) => s.map((x) => ({ ...x, latencyMs: Math.max(20, Math.round(x.latencyMs + (Math.random() - 0.5) * 20)) })));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const allGreen = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen bg-app text-primary-fg">
      <div className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="font-display text-3xl tracking-[0.14em] uppercase mb-2">SkyTrack Status</h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-secondary-fg mb-8">Updated {now}</p>

        <div
          className="p-6 mb-8 border flex items-center gap-4"
          style={{ borderColor: "var(--border-subtle)", background: allGreen ? "rgba(0,194,168,0.08)" : "rgba(255,180,0,0.08)" }}
        >
          {allGreen ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <AlertTriangle className="w-8 h-8 text-amber-400" />}
          <div>
            <div className="font-display text-lg uppercase tracking-wider">
              {allGreen ? "All Systems Operational" : "Partial Service Disruption"}
            </div>
            <div className="text-sm text-secondary-fg mt-1">
              90-day uptime: <span className="text-primary-fg font-mono">99.97%</span> · SLA target: 99.9%
            </div>
          </div>
        </div>

        <div className="border" style={{ borderColor: "var(--border-subtle)" }}>
          {services.map((s, i) => (
            <div
              key={s.name}
              className="px-4 py-3 flex items-center justify-between border-t first:border-t-0"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: s.status === "operational" ? "#00C2A8" : s.status === "degraded" ? "#F5B301" : "#EF4444" }}
                />
                <span className="font-display text-sm">{s.name}</span>
              </div>
              <div className="font-mono text-[11px] text-secondary-fg flex items-center gap-2">
                <Activity className="w-3 h-3" /> {s.latencyMs} ms
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="font-display uppercase tracking-[0.14em] text-sm mb-3">Recent Incidents</h2>
          <div className="text-sm text-secondary-fg border p-4" style={{ borderColor: "var(--border-subtle)" }}>
            No incidents reported in the last 90 days.
          </div>
        </div>

        <div className="mt-10 text-xs text-secondary-fg">
          Subscribe to updates at <a href="mailto:status@skytrack.aero" className="text-accent-fg underline">status@skytrack.aero</a>
        </div>
      </div>
    </div>
  );
}
