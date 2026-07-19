import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radar, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/use-category";
import { pageHead } from "@/lib/routeHead";

const WorldMap = lazy(() => import("@/components/tracker/WorldMap"));

export const Route = createFileRoute("/_authenticated/tracker")({
  head: pageHead({
    title: "Live Tracker — SkyTrack AAOS",
    description: "Live radar-style tracker for your fleet. Super admins see all organizations, color-coded.",
    path: "/tracker",
  }),
  component: TrackerPage,
});


// Deterministic vivid color per org id — golden-angle hue spacing so
// adjacent orgs (alphabetically or by insertion) never collide visually.
function orgColor(orgId: string): string {
  let h = 2166136261;
  for (let i = 0; i < orgId.length; i++) {
    h ^= orgId.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const hue = Math.round(((h % 1000) / 1000) * 360 * 0.61803398875) % 360;
  const sat = 78 + (h % 12);
  const light = 58 + ((h >> 8) % 8);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

type Row = {
  id: string;
  flight_number: string;
  origin_icao: string;
  destination_icao: string;
  status: string;
  progress_pct: number | null;
  scheduled_departure: string;
  org_id: string;
  // aircraft.icao24_hex included below for ADS-B live-match on the map
  aircraft: { id: string; tail_number: string; airline: string | null; icao24_hex: string | null } | null;
  organizations: { name: string } | null;
};



function TrackerPage() {
  const { data: isSuper = false } = useSuperAdmin();
  const [orgFilter, setOrgFilter] = useState<Set<string>>(new Set());
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["tracker-flights"],
    refetchInterval: 15000,
    queryFn: async () => {
      // RLS scopes rows: regular users see their org only; super-admin sees all
      // via the `is_super_admin(auth.uid())` branch in the flights SELECT policy.
      const { data } = await supabase
        .from("flights")
        .select("id, flight_number, origin_icao, destination_icao, status, progress_pct, scheduled_departure, org_id, aircraft(id, tail_number, airline), organizations(name)")
        .in("status", ["En_Route", "Departed", "Approach", "Scheduled", "Boarding"])
        .order("scheduled_departure", { ascending: true })
        .limit(400);
      return (data ?? []) as unknown as Row[];
    },
  });

  const orgs = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>();
    for (const f of flights) {
      const name = f.organizations?.name ?? "Unknown org";
      const cur = map.get(f.org_id);
      if (cur) cur.count++;
      else map.set(f.org_id, { name, color: orgColor(f.org_id), count: 1 });
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [flights]);

  const visibleFlights = useMemo(() => {
    if (!isSuper || orgFilter.size === 0) return flights;
    return flights.filter((f) => orgFilter.has(f.org_id));
  }, [flights, orgFilter, isSuper]);

  const toggleOrg = (id: string) => {
    setOrgFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4 px-2 py-4 sm:px-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-primary-fg flex items-center gap-2">
            <Radar className="h-5 w-5 text-emerald-400" /> Live Tracker
          </h1>
          <p className="mt-1 text-xs text-secondary-fg">
            {isSuper
              ? `Super-admin view — ${orgs.length} organization${orgs.length === 1 ? "" : "s"} active, color-coded. Click a chip to filter.`
              : "Your organization's active aircraft in real time."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuper && orgFilter.size > 0 && (
            <button
              onClick={() => setOrgFilter(new Set())}
              className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-slate-300 hover:bg-white/5"
            >
              <X className="h-3 w-3" /> Clear filter
            </button>
          )}
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">
            {isLoading ? "Syncing…" : `${visibleFlights.length}/${flights.length} active`}
          </div>
        </div>
      </header>

      <ClientOnly fallback={<div className="h-[520px] rounded-2xl bg-slate-950/60 animate-pulse" />}>
        <Suspense fallback={<div className="h-[520px] rounded-2xl bg-slate-950/60 animate-pulse" />}>
          <WorldMap flights={visibleFlights} selectedFlightId={selectedFlightId} onSelect={setSelectedFlightId} />
        </Suspense>
      </ClientOnly>

      {orgs.length > 0 && (
        <section
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">
              {isSuper ? `Organizations (${orgs.length})` : "Organization"}
            </h2>
            {isSuper && (
              <span className="font-mono text-[10px] text-slate-500">
                {orgFilter.size === 0 ? "showing all" : `${orgFilter.size} selected`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {orgs.map((o) => {
              const active = orgFilter.size === 0 || orgFilter.has(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => isSuper && toggleOrg(o.id)}
                  disabled={!isSuper}
                  className="flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-opacity"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${o.color}${active ? "88" : "22"}`,
                    opacity: active ? 1 : 0.35,
                    cursor: isSuper ? "pointer" : "default",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: o.color, boxShadow: `0 0 8px ${o.color}` }} />
                  <span className="text-slate-200">{o.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{o.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <TrackerTable
        flights={visibleFlights}
        isSuper={isSuper}
        selectedId={selectedFlightId}
        onSelect={setSelectedFlightId}
      />
    </div>
  );
}


function TrackerTable({
  flights, isSuper, selectedId, onSelect,
}: {
  flights: Row[]; isSuper: boolean; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  if (flights.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
        No active flights right now.
      </div>
    );
  }
  return (
    <section
      className="rounded-2xl p-4 overflow-x-auto"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-secondary-fg">
          <tr>
            <th className="py-2 text-left">Flight</th>
            <th className="py-2 text-left">Tail</th>
            <th className="py-2 text-left">Route</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-left">Progress</th>
            {isSuper && <th className="py-2 text-left">Organization</th>}
            <th className="py-2 text-right">Jump to</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((f) => {
            const isSel = selectedId === f.id;
            return (
              <tr
                key={f.id}
                onClick={() => onSelect(isSel ? null : f.id)}
                className="cursor-pointer border-t transition-colors hover:bg-white/[0.03]"
                style={{
                  borderColor: "rgba(255,255,255,0.04)",
                  background: isSel ? `${orgColor(f.org_id)}12` : undefined,
                }}
              >
                <td className="py-2 font-mono">{f.flight_number}</td>
                <td className="py-2 font-mono text-slate-300">{f.aircraft?.tail_number ?? "—"}</td>
                <td className="py-2 text-slate-400">{f.origin_icao} → {f.destination_icao}</td>
                <td className="py-2 text-slate-400">{f.status.replace("_", " ")}</td>
                <td className="py-2 font-mono text-slate-400">{f.progress_pct ?? 0}%</td>
                {isSuper && (
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: orgColor(f.org_id) }} />
                      <span className="text-slate-300">{f.organizations?.name ?? "—"}</span>
                    </span>
                  </td>
                )}
                <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-2">
                    {f.aircraft?.id && (
                      <Link
                        to="/fleet/$id"
                        params={{ id: f.aircraft.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300 hover:bg-white/5"
                      >
                        Aircraft <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                    <Link
                      to="/flights/$id"
                      params={{ id: f.id }}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300 hover:bg-white/5"
                    >
                      Flight <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
