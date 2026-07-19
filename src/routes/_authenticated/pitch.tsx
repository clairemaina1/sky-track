import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPitchMetrics, type PitchMetrics } from "@/lib/pitch-metrics.functions";
import { useCurrentOrg } from "@/hooks/use-org";
import { Printer, Plane, Users, Package, Leaf, Wrench, AlertTriangle, TrendingUp } from "lucide-react";
import "@/styles/pitch-print.css";

export const Route = createFileRoute("/_authenticated/pitch")({
  head: pageHead({ title: "One-Pager — SkyTrack", description: "Live sales one-pager built from your org's real metrics.", path: "/pitch" }),
  component: PitchPage,
});

function PitchPage() {
  const org = useCurrentOrg();
  const fetchMetrics = useServerFn(getPitchMetrics);
  const { data, isLoading, error } = useQuery<PitchMetrics>({
    queryKey: ["pitch-metrics", org?.org_id],
    queryFn: () => fetchMetrics({ data: { orgId: org!.org_id } }),
    enabled: !!org?.org_id,
    staleTime: 30_000,
  });

  return (
    <div className="p-6 pitch-root">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">Sales One-Pager</h1>
            <p className="text-secondary-fg text-sm">Auto-generated from your live SkyTrack data. Print or save as PDF for prospects.</p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-accent text-accent font-display uppercase text-xs tracking-widest hover:bg-accent hover:text-black transition"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>

        {isLoading && <div className="text-secondary-fg text-sm">Computing live metrics…</div>}
        {error && <div className="text-red-400 text-sm">{(error as Error).message}</div>}
        {data && <PitchSheet m={data} />}
      </div>
    </div>
  );
}

function PitchSheet({ m }: { m: PitchMetrics }) {
  return (
    <article className="pitch-sheet bg-panel border border-border-subtle p-10 space-y-8 text-primary-fg">
      <header className="flex items-start justify-between border-b border-border-subtle pb-6">
        <div>
          <div className="font-display uppercase text-[10px] tracking-[0.2em] text-accent">SkyTrack AAOS · Executive Brief</div>
          <h2 className="font-display text-4xl mt-1">{m.org_name}</h2>
          <p className="text-secondary-fg text-sm mt-2 max-w-[520px]">
            Agentic aviation operations — delay mitigation, asset utilization, and CORSIA-ready carbon reporting in one command surface.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-lg">SKYTRACK</div>
          <div className="font-mono text-[10px] text-secondary-fg mt-1">Generated {new Date(m.generated_at).toISOString().slice(0,10)}</div>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <Kpi icon={<Plane className="w-4 h-4" />} label="Fleet" value={m.fleet_size} suffix="tails" />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="On-time (30d)" value={m.on_time_pct} suffix="%" />
        <Kpi icon={<Users className="w-4 h-4" />} label="Crew" value={m.crew_count} suffix="active" />
        <Kpi icon={<Leaf className="w-4 h-4" />} label="CO₂ (30d)" value={m.co2_tonnes_30d} suffix="tonnes" />
        <Kpi icon={<Plane className="w-4 h-4" />} label="Flights (30d)" value={m.flights_30d} />
        <Kpi icon={<Package className="w-4 h-4" />} label="Cargo (30d)" value={m.cargo_tonnes} suffix="t" />
        <Kpi icon={<Wrench className="w-4 h-4" />} label="Open MRO" value={m.open_maintenance} />
        <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="AOG now" value={m.aog_current} accent={m.aog_current > 0} />
      </section>

      <section className="grid grid-cols-2 gap-6">
        <Block title="What SkyTrack does for you">
          <ul className="space-y-2 text-sm text-secondary-fg list-disc list-inside">
            <li><span className="text-primary-fg">Delay mitigation</span> — weather-risk + duty-time enforcement stop cascading cancellations.</li>
            <li><span className="text-primary-fg">Asset utilization</span> — predictive MRO + fuel-burn heatmap surface hidden $/block-hour.</li>
            <li><span className="text-primary-fg">CORSIA-ready reporting</span> — one-click regulator export, hash-chained audit trail.</li>
            <li><span className="text-primary-fg">Crew "command choice"</span> — pilots accept/decline offered flights on their phone.</li>
          </ul>
        </Block>
        <Block title="Fleet status breakdown">
          <div className="space-y-2">
            {Object.entries(m.aircraft_status).length === 0 && (
              <div className="text-secondary-fg text-sm">Import your fleet to see live status.</div>
            )}
            {Object.entries(m.aircraft_status).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="capitalize text-secondary-fg">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-primary-fg">{v}</span>
              </div>
            ))}
          </div>
        </Block>
      </section>

      <section className="border border-border-subtle p-5">
        <div className="font-display uppercase text-[10px] tracking-[0.2em] text-accent mb-2">The pitch</div>
        <p className="text-sm text-primary-fg leading-relaxed">
          {m.org_name} currently operates {m.fleet_size} aircraft with {m.flights_30d} flights in the last 30 days and
          {" "}{m.on_time_pct}% on-time performance. SkyTrack's benchmark customers lift on-time by 4–7 points in the first
          quarter through weather-aware dispatch and duty-time enforcement, and recover 60–90 minutes of daily block time per
          tail via predictive MRO. Applied to your fleet, that is roughly <span className="text-accent">{Math.max(1, Math.round(m.fleet_size * 60 / 60))} extra rotations/day</span> and a
          measurable reduction on your {m.co2_tonnes_30d} tonnes/month CO₂ footprint — reported in the CORSIA format your regulator already accepts.
        </p>
      </section>

      <footer className="flex items-center justify-between text-[10px] font-mono text-secondary-fg border-t border-border-subtle pt-4">
        <span>skytrack.aero · Agentic Aviation Ops</span>
        <span>Confidential — prepared for {m.org_name}</span>
      </footer>
    </article>
  );
}

function Kpi({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number | string; suffix?: string; accent?: boolean }) {
  return (
    <div className="border border-border-subtle p-3">
      <div className="flex items-center gap-1.5 text-secondary-fg text-[10px] font-display uppercase tracking-[0.14em]">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl" style={{ color: accent ? "var(--status-red)" : "var(--text-primary)" }}>
        {value}{suffix && <span className="text-secondary-fg text-sm ml-1 font-mono">{suffix}</span>}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-subtle p-5">
      <div className="font-display uppercase text-[10px] tracking-[0.2em] text-accent mb-3">{title}</div>
      {children}
    </div>
  );
}
