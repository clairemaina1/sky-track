import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plane, MapPin, Clock, Users, Leaf, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { pageHead } from "@/lib/routeHead";
import type { Flight, Aircraft, Cargo } from "@/lib/types";
import { airportLabel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/flights/$id")({
  head: pageHead({
    title: "Flight Detail — SkyTrack AAOS",
    description: "Flight timeline: route, aircraft, crew, cargo manifest and disruption history for a single sector.",
    path: "/flights",
  }),
  component: FlightDetailPage,
});

function FlightDetailPage() {
  const { id } = useParams({ from: "/_authenticated/flights/$id" });

  const { data: flight, isLoading } = useQuery({
    queryKey: ["flight", id],
    queryFn: async () =>
      (await supabase.from("flights").select("*").eq("id", id).maybeSingle()).data as Flight | null,
  });

  const { data: aircraft } = useQuery({
    queryKey: ["aircraft", "for-flight", flight?.aircraft_id],
    enabled: !!flight?.aircraft_id,
    queryFn: async () =>
      (
        await supabase.from("aircraft").select("*").eq("id", flight!.aircraft_id!).maybeSingle()
      ).data as Aircraft | null,
  });

  const { data: cargo = [] } = useQuery({
    queryKey: ["cargo", "for-flight", id],
    enabled: !!flight,
    queryFn: async () =>
      ((await supabase.from("cargo").select("*").eq("flight_id", id)).data ?? []) as Cargo[],
  });

  if (isLoading) {
    return <div className="p-6 font-mono text-sm text-slate-400">Loading sector…</div>;
  }
  if (!flight) {
    return (
      <div className="space-y-3 p-6">
        <Link to="/flights" className="text-xs uppercase tracking-wider text-emerald-400">
          ← Back to board
        </Link>
        <div className="panel p-6 text-center font-display uppercase tracking-wider">Flight not found</div>
      </div>
    );
  }

  const dep = flight.actual_departure ?? flight.scheduled_departure;
  const arr = flight.actual_arrival ?? flight.scheduled_arrival;
  const durationMin = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000);
  const totalKg = cargo.reduce((s, c) => s + Number(c.weight_kg), 0);

  const timeline = [
    { time: flight.scheduled_departure, label: "Scheduled departure", tone: "text-slate-300" },
    flight.actual_departure
      ? { time: flight.actual_departure, label: "Actual departure", tone: "text-emerald-400" }
      : null,
    flight.actual_arrival
      ? { time: flight.actual_arrival, label: "Actual arrival", tone: "text-emerald-400" }
      : null,
    { time: flight.scheduled_arrival, label: "Scheduled arrival", tone: "text-slate-300" },
  ].filter(Boolean) as { time: string; label: string; tone: string }[];
  timeline.sort((a, b) => +new Date(a.time) - +new Date(b.time));

  return (
    <div className="space-y-5 px-2 py-4 sm:px-4">
      <div className="flex items-center justify-between">
        <Link
          to="/flights"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400 hover:text-emerald-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Flights
        </Link>
        <StatusBadge status={flight.status} />
      </div>

      <header
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg, rgba(10,20,42,0.97) 0%, rgba(5,12,26,0.97) 100%)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {flight.flight_number}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {airportLabel(flight.origin_icao)} → {airportLabel(flight.destination_icao)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {Math.floor(durationMin / 60)}h {durationMin % 60}m
            </span>
            {flight.delay_reason && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                Delay: {flight.delay_reason}
              </span>
            )}
            {aircraft && (
              <Link
                to="/fleet/$id"
                params={{ id: aircraft.id }}
                className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Plane className="h-3 w-3" /> {aircraft.tail_number}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Sector facts" icon={<Activity className="h-3.5 w-3.5" />}>
          <ul className="space-y-2 text-xs">
            <Row label="Origin" value={`${flight.origin_icao}`} />
            <Row label="Destination" value={`${flight.destination_icao}`} />
            <Row label="Status" value={flight.status} />
            <Row label="Fuel planned" value={flight.fuel_planned_kg ? `${flight.fuel_planned_kg} kg` : "—"} />
            <Row label="Fuel actual" value={flight.fuel_actual_kg ? `${flight.fuel_actual_kg} kg` : "—"} />
          </ul>
        </Panel>

        <Panel title="Aircraft" icon={<Plane className="h-3.5 w-3.5" />}>
          {!aircraft ? (
            <Empty>Not assigned.</Empty>
          ) : (
            <ul className="space-y-2 text-xs">
              <Row label="Registration" value={aircraft.tail_number} />
              <Row label="Type" value={aircraft.model} />
              <Row label="Health" value={`${Math.round(Number(aircraft.health_score))}%`} />
              <Row label="Total hrs" value={aircraft.flight_hours_total.toLocaleString()} />
              <Row
                label="Base"
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {aircraft.base_airport}
                  </span>
                }
              />
            </ul>
          )}
        </Panel>

        <Panel title="Cargo manifest" icon={<Leaf className="h-3.5 w-3.5" />}>
          {cargo.length === 0 ? (
            <Empty>No cargo on this sector.</Empty>
          ) : (
            <>
              <div className="mb-2 text-[11px] text-slate-400">
                {cargo.length} shipments · {totalKg.toLocaleString()} kg total
              </div>
              <ul className="divide-y text-xs" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {cargo.slice(0, 6).map((c) => (
                  <li key={c.id} className="py-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-emerald-400">{c.awb_number}</span>
                      <span className="font-mono text-slate-400">{Number(c.weight_kg).toLocaleString()} kg</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {c.shipper} → {c.consignee}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <section
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <h2
          className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Users className="h-3 w-3" /> Sector timeline
        </h2>
        <ol className="relative space-y-3 pl-4" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          {timeline.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-emerald-400/60" />
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-xs ${e.tone}`}>{e.label}</p>
                <time className="font-mono text-[10px] text-slate-500">{new Date(e.time).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ol>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-mono text-[11px] text-slate-200">{value}</span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-white/10 p-3 text-center text-[11px] text-slate-500">{children}</div>;
}
