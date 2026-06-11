import { useEffect, useId, useRef, useState } from "react";
import type { FlightRowData } from "@/components/flights/FlightRow";

const AIRPORT_COORDS: Record<string, [number, number]> = {
  HKJK: [-1.319, 36.927], HKWL: [-1.323, 36.806], HTDA: [-6.878, 39.202],
  HAAB: [8.978, 38.799], FYYY: [-22.480, 17.470], FAOR: [-26.139, 28.246],
  DNMM: [6.577, 3.321], DIAP: [5.254, -3.927], EGLL: [51.477, -0.461],
  LFPG: [49.009, 2.548], OMDB: [25.253, 55.365], RJTT: [35.549, 139.780],
  KLAX: [33.942, -118.408], KJFK: [40.640, -73.779], YSSY: [-33.946, 151.177],
};

export interface LivePosition {
  flight_id: string;
  latitude: number;
  longitude: number;
  heading_deg?: number | null;
}

interface LiveMapProps {
  flights: FlightRowData[];
  livePositions?: LivePosition[];
  height?: number;
}

function project(lat: number, lon: number, w: number, h: number): [number, number] {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}
function buildArcPath([x1, y1]: [number, number], [x2, y2]: [number, number]): string {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curve = dist * 0.22;
  const cx = mx - (dy / dist) * curve;
  const cy = my + (dx / dist) * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
function bezierPoint(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
}

export function LiveMap({ flights, livePositions = [], height = 280 }: LiveMapProps) {
  const uid = useId().replace(/:/g, "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapDims, setMapDims] = useState({ width: 800, height });
  const tRef = useRef<Map<string, number>>(new Map());
  void livePositions;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setMapDims({ width: e.contentRect.width, height });
    });
    ro.observe(containerRef.current);
    setMapDims({ width: containerRef.current.offsetWidth, height });
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: W, height: H } = mapDims;
    canvas.width = W;
    canvas.height = H;

    const active = flights.filter((f) =>
      f.status === "En_Route" || f.status === "Departed" || f.status === "Approach"
    );

    function tick() {
      ctx!.clearRect(0, 0, W, H);
      for (const f of active) {
        const oc = AIRPORT_COORDS[f.origin_icao];
        const dc = AIRPORT_COORDS[f.destination_icao];
        if (!oc || !dc) continue;
        const [ox, oy] = project(oc[0], oc[1], W, H);
        const [dx, dy] = project(dc[0], dc[1], W, H);
        let t = tRef.current.get(f.id) ?? (f.progress_pct ?? 0) / 100;
        t += 0.0008;
        if (t > 1) t = 0;
        tRef.current.set(f.id, t);
        const mx = (ox + dx) / 2, my = (oy + dy) / 2;
        const fdx = dx - ox, fdy = dy - oy;
        const dist = Math.sqrt(fdx * fdx + fdy * fdy);
        const curve = dist * 0.22;
        const cpx = mx - (fdy / dist) * curve;
        const cpy = my + (fdx / dist) * curve;
        const [px, py] = bezierPoint([ox, oy], [cpx, cpy], [dx, dy], t);

        const grad = ctx!.createRadialGradient(px, py, 0, px, py, 14);
        grad.addColorStop(0, "rgba(52,211,153,0.6)");
        grad.addColorStop(0.4, "rgba(52,211,153,0.15)");
        grad.addColorStop(1, "rgba(52,211,153,0)");
        ctx!.beginPath();
        ctx!.arc(px, py, 14, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = "#34d399";
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx!.fillStyle = "white";
        ctx!.fill();
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [flights, mapDims]);

  const arcs = flights
    .map((f) => {
      const oc = AIRPORT_COORDS[f.origin_icao];
      const dc = AIRPORT_COORDS[f.destination_icao];
      if (!oc || !dc) return null;
      const [ox, oy] = project(oc[0], oc[1], mapDims.width, mapDims.height);
      const [dx, dy] = project(dc[0], dc[1], mapDims.width, mapDims.height);
      const isActive = f.status === "En_Route" || f.status === "Departed" || f.status === "Approach";
      return { flight: f, path: buildArcPath([ox, oy], [dx, dy]), ox, oy, dx, dy, isActive };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const airportDots = new Map<string, { x: number; y: number; iata: string }>();
  for (const arc of arcs) {
    const f = arc.flight;
    if (!airportDots.has(f.origin_icao)) airportDots.set(f.origin_icao, { x: arc.ox, y: arc.oy, iata: f.origin_iata });
    if (!airportDots.has(f.destination_icao)) airportDots.set(f.destination_icao, { x: arc.dx, y: arc.dy, iata: f.destination_iata });
  }

  const { width: W, height: H } = mapDims;
  const airborneCount = flights.filter(
    (f) => f.status === "En_Route" || f.status === "Departed" || f.status === "Approach"
  ).length;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        height,
        background: "linear-gradient(160deg, #060d1f 0%, #040a18 100%)",
        border: "1px solid rgba(52,211,153,0.07)",
      }}
      aria-label="Live flight map"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(4,10,24,0.8) 100%)" }} />

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 z-10" aria-hidden="true">
        <defs>
          <style>{`@keyframes dashFlow { to { stroke-dashoffset: -24; } } .arc-active-${uid} { animation: dashFlow 1.2s linear infinite; }`}</style>
          <filter id={`${uid}-dot-glow`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id={`${uid}-grid`} width={W / 12} height={H / 6} patternUnits="userSpaceOnUse">
            <path d={`M ${W / 12} 0 L 0 0 0 ${H / 6}`} fill="none" stroke="rgba(52,211,153,0.025)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${uid}-grid)`} />

        {arcs.map(({ flight: f, path, isActive }) => (
          <g key={f.id}>
            <path d={path} fill="none"
              stroke={isActive ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)"}
              strokeWidth={isActive ? "6" : "3"} strokeLinecap="round" />
            <path d={path} fill="none"
              stroke={isActive ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.07)"}
              strokeWidth={isActive ? "1.5" : "1"} strokeLinecap="round"
              strokeDasharray={isActive ? "6 6" : "none"}
              className={isActive ? `arc-active-${uid}` : ""} />
          </g>
        ))}

        {Array.from(airportDots.values()).map((ap) => (
          <g key={ap.iata} filter={`url(#${uid}-dot-glow)`}>
            <circle cx={ap.x} cy={ap.y} r="5" fill="none" stroke="rgba(52,211,153,0.2)" strokeWidth="1" />
            <circle cx={ap.x} cy={ap.y} r="2.5" fill="rgba(52,211,153,0.5)" />
            <text x={ap.x + 8} y={ap.y + 4} fill="rgba(52,211,153,0.6)" fontSize="7"
              fontFamily="'JetBrains Mono', monospace" fontWeight="500">
              {ap.iata}
            </text>
          </g>
        ))}
      </svg>

      <canvas ref={canvasRef} className="absolute inset-0 z-10" style={{ pointerEvents: "none" }} aria-hidden="true" />

      <div className="absolute right-3 top-3 z-30">
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] font-semibold text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {airborneCount} airborne
          </span>
        </div>
      </div>
    </div>
  );
}
