import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/use-category";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: pageHead({
    title: "Live Tracker — SkyTrack AAOS",
    description: "Live radar-style tracker for your fleet. Super admins see all organizations, color-coded.",
    path: "/tracker",
  }),
  component: TrackerPage,
});

const AIRPORT_COORDS: Record<string, [number, number]> = {
  HKJK: [-1.319, 36.927], HKWL: [-1.323, 36.806], HKNW: [-1.322, 36.815],
  HTDA: [-6.878, 39.202], HAAB: [8.978, 38.799], FYYY: [-22.48, 17.47],
  FAOR: [-26.139, 28.246], DNMM: [6.577, 3.321], DIAP: [5.254, -3.927],
  EGLL: [51.477, -0.461], LFPG: [49.009, 2.548], OMDB: [25.253, 55.365],
  RJTT: [35.549, 139.78], KLAX: [33.942, -118.408], KJFK: [40.64, -73.779],
  YSSY: [-33.946, 151.177], HRYR: [-1.9686, 30.1395], HUEN: [0.0424, 32.4435],
  HSSS: [15.5895, 32.5532], FZAA: [-4.3858, 15.4446],
};

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
  aircraft: { id: string; tail_number: string; airline: string | null } | null;
  organizations: { name: string } | null;
};

function project(lat: number, lon: number, w: number, h: number): [number, number] {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}

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

      <Radar2DMap flights={visibleFlights} selectedFlightId={selectedFlightId} />

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

function Radar2DMap({ flights, selectedFlightId }: { flights: Row[]; selectedFlightId: string | null }) {
  const uid = useId().replace(/:/g, "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const tRef = useRef<Map<string, number>>(new Map());
  const [dims, setDims] = useState({ w: 900, h: 460 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((es) => {
      for (const e of es) setDims({ w: e.contentRect.width, h: 460 });
    });
    ro.observe(containerRef.current);
    setDims({ w: containerRef.current.offsetWidth, h: 460 });
    return () => ro.disconnect();
  }, []);

  const routes = useMemo(() => {
    return flights
      .map((f) => {
        const o = AIRPORT_COORDS[f.origin_icao];
        const d = AIRPORT_COORDS[f.destination_icao];
        if (!o || !d) return null;
        return { f, o, d, color: orgColor(f.org_id) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [flights]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = dims.w;
    canvas.height = dims.h;

    function tick() {
      ctx!.clearRect(0, 0, dims.w, dims.h);
      for (const r of routes) {
        const [ox, oy] = project(r.o[0], r.o[1], dims.w, dims.h);
        const [dx, dy] = project(r.d[0], r.d[1], dims.w, dims.h);
        const mx = (ox + dx) / 2, my = (oy + dy) / 2;
        const fdx = dx - ox, fdy = dy - oy;
        const dist = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
        const cpx = mx - (fdy / dist) * dist * 0.22;
        const cpy = my + (fdx / dist) * dist * 0.22;

        let t = tRef.current.get(r.f.id) ?? (r.f.progress_pct ?? 20) / 100;
        const active = r.f.status === "En_Route" || r.f.status === "Departed" || r.f.status === "Approach";
        if (active) t += 0.0009;
        if (t > 1) t = 0;
        tRef.current.set(r.f.id, t);

        const mt = 1 - t;
        const px = mt * mt * ox + 2 * mt * t * cpx + t * t * dx;
        const py = mt * mt * oy + 2 * mt * t * cpy + t * t * dy;

        const isSel = selectedFlightId === r.f.id;
        const radius = isSel ? 24 : 16;
        const glow = ctx!.createRadialGradient(px, py, 0, px, py, radius);
        glow.addColorStop(0, `${r.color}`);
        glow.addColorStop(0.4, `${r.color}44`);
        glow.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(px, py, radius, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(px, py, isSel ? 5 : 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = r.color;
        ctx!.fill();

        if (isSel) {
          ctx!.strokeStyle = "rgba(255,255,255,0.9)";
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.arc(px, py, 10, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.fillStyle = isSel ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.85)";
        ctx!.font = `${isSel ? 11 : 10}px 'JetBrains Mono', monospace`;
        ctx!.fillText(r.f.aircraft?.tail_number ?? r.f.flight_number, px + 7, py + 3);
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [routes, dims, selectedFlightId]);

  const airportDots = new Map<string, { x: number; y: number; icao: string }>();
  for (const r of routes) {
    const [ox, oy] = project(r.o[0], r.o[1], dims.w, dims.h);
    const [dx, dy] = project(r.d[0], r.d[1], dims.w, dims.h);
    airportDots.set(r.f.origin_icao, { x: ox, y: oy, icao: r.f.origin_icao });
    airportDots.set(r.f.destination_icao, { x: dx, y: dy, icao: r.f.destination_icao });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        height: 460,
        background: "radial-gradient(ellipse at 30% 40%, #071427 0%, #030812 70%)",
        border: "1px solid rgba(52,211,153,0.1)",
      }}
    >
      <svg width={dims.w} height={dims.h} className="absolute inset-0" aria-hidden="true">
        <defs>
          <pattern id={`${uid}-grid`} width={dims.w / 16} height={dims.h / 8} patternUnits="userSpaceOnUse">
            <path d={`M ${dims.w / 16} 0 L 0 0 0 ${dims.h / 8}`} fill="none" stroke="rgba(52,211,153,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={dims.w} height={dims.h} fill={`url(#${uid}-grid)`} />
        {routes.map((r, i) => {
          const [ox, oy] = project(r.o[0], r.o[1], dims.w, dims.h);
          const [dx, dy] = project(r.d[0], r.d[1], dims.w, dims.h);
          const mx = (ox + dx) / 2, my = (oy + dy) / 2;
          const fdx = dx - ox, fdy = dy - oy;
          const dist = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
          const cpx = mx - (fdy / dist) * dist * 0.22;
          const cpy = my + (fdx / dist) * dist * 0.22;
          const isSel = selectedFlightId === r.f.id;
          return (
            <path
              key={r.f.id + i}
              d={`M ${ox} ${oy} Q ${cpx} ${cpy} ${dx} ${dy}`}
              fill="none"
              stroke={r.color}
              strokeOpacity={isSel ? 0.85 : 0.35}
              strokeWidth={isSel ? 2 : 1.2}
              strokeDasharray={isSel ? "0" : "4 4"}
            />
          );
        })}
        {Array.from(airportDots.values()).map((a) => (
          <g key={a.icao}>
            <circle cx={a.x} cy={a.y} r={3} fill="rgba(255,255,255,0.55)" />
            <text x={a.x + 6} y={a.y - 6} fill="rgba(255,255,255,0.5)" fontSize={8} fontFamily="'JetBrains Mono', monospace">
              {a.icao}
            </text>
          </g>
        ))}
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[9px] font-semibold text-emerald-400 font-mono">LIVE</span>
      </div>
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
