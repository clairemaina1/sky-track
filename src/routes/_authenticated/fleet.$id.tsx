import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wrench, Plane, Users, FileText, Calendar, MapPin, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { HealthGauge } from "@/components/fleet/HealthGauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { pageHead } from "@/lib/routeHead";
import type { Aircraft, Flight, Maintenance, Crew } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/fleet/$id")({
  head: pageHead({
    title: "Aircraft Detail — SkyTrack AAOS",
    description: "Aircraft timeline: maintenance history, upcoming sectors, crew assignments and airworthiness docs.",
    path: "/fleet",
  }),
  component: AircraftDetailPage,
});

function AircraftDetailPage() {
  const { id } = useParams({ from: "/_authenticated/fleet/$id" });
  const [orgId] = useCurrentOrgId();

  const { data: ac, isLoading } = useQuery({
    queryKey: ["aircraft", id],
    queryFn: async () =>
      (await supabase.from("aircraft").select("*").eq("id", id).maybeSingle()).data as Aircraft | null,
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["maintenance", "by-aircraft", id],
    enabled: !!ac,
    queryFn: async () =>
      ((
        await supabase
          .from("maintenance")
          .select("*")
          .eq("aircraft_id", id)
          .order("opened_at", { ascending: false })
      ).data ?? []) as Maintenance[],
  });

  const { data: flights = [] } = useQuery({
    queryKey: ["flights", "by-aircraft", id],
    enabled: !!ac,
    queryFn: async () =>
      ((
        await supabase
          .from("flights")
          .select("*")
          .eq("aircraft_id", id)
          .order("scheduled_departure", { ascending: false })
          .limit(15)
      ).data ?? []) as Flight[],
  });

  const { data: crew = [] } = useQuery({
    queryKey: ["crew", "for-aircraft", id, orgId],
    enabled: !!ac && !!orgId,
    queryFn: async () =>
      ((
        await supabase
          .from("crew")
          .select("*")
          .eq("org_id", orgId!)
          .eq("current_assignment", id)
      ).data ?? []) as Crew[],
  });

  if (isLoading) {
    return <div className="p-6 font-mono text-sm text-slate-400">Loading aircraft…</div>;
  }
  if (!ac) {
    return (
      <div className="space-y-3 p-6">
        <Link to="/fleet" className="text-xs uppercase tracking-wider text-emerald-400">
          ← Back to fleet
        </Link>
        <div className="panel p-6 text-center font-display uppercase tracking-wider">
          Aircraft not found
        </div>
      </div>
    );
  }

  const meta = (ac.metadata as Record<string, unknown> | null) ?? {};
  const upcoming = flights.filter((f) => new Date(f.scheduled_departure) > new Date());
  const past = flights.filter((f) => new Date(f.scheduled_departure) <= new Date());

  // Build a unified timeline (newest first) from maintenance + flights
  const timeline: { date: string; kind: "mx" | "flight"; title: string; sub: string; tone: string }[] = [];
  for (const m of maintenance) {
    timeline.push({
      date: m.opened_at,
      kind: "mx",
      title: `Work order ${m.work_order_number} · ${m.title}`,
      sub: `${m.status} · ${m.priority ?? "Normal"} priority · ${m.triggered_by}`,
      tone: m.status === "Open" ? "text-amber-400" : "text-slate-400",
    });
  }
  for (const f of past) {
    timeline.push({
      date: f.scheduled_departure,
      kind: "flight",
      title: `${f.flight_number} · ${f.origin_icao} → ${f.destination_icao}`,
      sub: `${f.status}${f.delay_reason ? ` · ${f.delay_reason}` : ""}`,
      tone: "text-slate-300",
    });
  }
  timeline.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="space-y-5 px-2 py-4 sm:px-4">
      <div className="flex items-center justify-between">
        <Link
          to="/fleet"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-emerald-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Fleet
        </Link>
        <StatusBadge status={ac.status} pulse={ac.status === "AOG"} />
      </div>

      <header
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg, rgba(10,20,42,0.97) 0%, rgba(5,12,26,0.97) 100%)",
          border: `1px solid ${ac.status === "AOG" ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.05)"}`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="text-3xl font-semibold tracking-tight text-slate-100"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {ac.tail_number}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {ac.airline} · {ac.model}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Base {ac.base_airport}
              </span>
              {ac.current_airport && (
                <span className="inline-flex items-center gap-1.5">
                  <Plane className="h-3 w-3" /> Currently {ac.current_airport}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Activity className="h-3 w-3" /> {ac.flight_hours_total.toLocaleString()} TAH
              </span>
            </div>
          </div>
          <HealthGauge
            score={Number(ac.health_score)}
            rulHours={typeof meta.rul_hours === "number" ? meta.rul_hours : null}
            rulCycles={typeof meta.rul_cycles === "number" ? meta.rul_cycles : null}
            size={120}
          />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Upcoming sectors" icon={<Calendar className="h-3.5 w-3.5" />}>
          {upcoming.length === 0 ? (
            <Empty>No scheduled flights.</Empty>
          ) : (
            <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {upcoming.slice(0, 6).map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <div className="font-mono text-slate-200">{f.flight_number}</div>
                    <div className="text-slate-500">
                      {f.origin_icao} → {f.destination_icao}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400">
                    {new Date(f.scheduled_departure).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Crew assigned" icon={<Users className="h-3.5 w-3.5" />}>
          {crew.length === 0 ? (
            <Empty>No active crew assignment.</Empty>
          ) : (
            <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {crew.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <Link
                      to="/crew/$id"
                      params={{ id: c.id }}
                      className="font-medium text-slate-200 hover:text-emerald-400"
                    >
                      {c.full_name}
                    </Link>
                    <div className="text-slate-500">{c.role}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Airworthiness docs" icon={<FileText className="h-3.5 w-3.5" />}>
          <ul className="space-y-2 text-xs">
            <DocRow label="Certificate of Airworthiness" detail="Current · expires 12 mo" ok />
            <DocRow
              label="Next maintenance check"
              detail={ac.next_maintenance_due ? new Date(ac.next_maintenance_due).toLocaleDateString() : "Not scheduled"}
              ok={!!ac.next_maintenance_due}
            />
            <DocRow label="Insurance" detail="Hull & liability · current" ok />
            <DocRow label="Noise certificate" detail="ICAO Annex 16 Vol I · valid" ok />
          </ul>
        </Panel>
      </div>

      <section
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Wrench className="h-3 w-3" /> Maintenance & sector history
        </h2>
        {timeline.length === 0 ? (
          <Empty>No timeline events yet.</Empty>
        ) : (
          <ol className="relative space-y-3 pl-4" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
            {timeline.slice(0, 25).map((e, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full"
                  style={{ background: e.kind === "mx" ? "#f59e0b" : "#10b981" }}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`text-xs ${e.tone}`}>{e.title}</p>
                  <time className="shrink-0 font-mono text-[10px] text-slate-500">
                    {new Date(e.date).toLocaleString()}
                  </time>
                </div>
                <p className="text-[11px] text-slate-500">{e.sub}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <h3
        className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-white/10 p-3 text-center text-[11px] text-slate-500">{children}</div>;
}

function DocRow({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-mono text-[11px] ${ok ? "text-emerald-400" : "text-red-400"}`}>
        {ok ? "✓" : "✗"} {detail}
      </span>
    </li>
  );
}
