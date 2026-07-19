import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { getLiveStates } from "@/lib/opensky.functions";
import { Radar, CheckCircle2, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/adsb-status")({
  head: pageHead({ title: "ADS-B Match Rate — SkyTrack", description: "Which of your tails are being tracked live, and which are dark.", path: "/adsb-status" }),
  component: AdsbStatusPage,
});

type Row = { tail: string; model: string; hex: string | null; tracked: boolean; lastSeen?: string; alt?: number; gs?: number };

function AdsbStatusPage() {
  const org = useCurrentOrg();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function run() {
      if (!org?.org_id) return;
      setLoading(true);
      const { data: ac } = await supabase.from("aircraft")
        .select("tail_number, model, icao24_hex")
        .eq("org_id", org.org_id);
      const list = ac ?? [];
      let live: Awaited<ReturnType<typeof getLiveStates>> = { states: [], time: Date.now() / 1000 } as never;
      try { live = await getLiveStates({ data: {} }); } catch { /* offline ok */ }
      const map = new Map<string, (typeof live.states)[number]>();
      for (const s of live.states ?? []) if (s.icao24) map.set(s.icao24.toLowerCase(), s);
      const merged: Row[] = list.map((a) => {
        const h = (a.icao24_hex ?? "").toLowerCase();
        const s = h ? map.get(h) : undefined;
        return {
          tail: a.tail_number, model: a.model, hex: a.icao24_hex,
          tracked: !!s,
          alt: s?.baro_altitude ?? undefined,
          gs: s?.velocity ?? undefined,
        };
      });
      if (!cancel) { setRows(merged); setLoading(false); }
    }
    run();
    const t = setInterval(run, 60_000);
    return () => { cancel = true; clearInterval(t); };
  }, [org?.org_id]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withHex = rows.filter((r) => r.hex).length;
    const tracked = rows.filter((r) => r.tracked).length;
    const dark = total - tracked;
    const pct = total ? Math.round((tracked / total) * 100) : 0;
    return { total, withHex, tracked, dark, pct };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Radar className="w-5 h-5 text-accent" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">ADS-B Match Rate</h1>
          <p className="text-secondary-fg text-sm">Real signal from OpenSky vs your registered fleet.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Fleet", v: stats.total },
          { l: "Hex-mapped", v: stats.withHex },
          { l: "Tracked now", v: stats.tracked },
          { l: "Dark", v: stats.dark },
        ].map((k) => (
          <div key={k.l} className="border border-border-subtle bg-panel p-4">
            <div className="text-secondary-fg font-display uppercase text-[10px] tracking-widest">{k.l}</div>
            <div className="text-primary-fg font-display text-3xl mt-1">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="border border-border-subtle bg-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display uppercase text-xs tracking-widest text-primary-fg">Live coverage</span>
          <span className="font-display text-lg text-accent">{stats.pct}%</span>
        </div>
        <div className="h-2 bg-void border border-border-subtle overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <section className="border border-border-subtle bg-panel">
        <table className="w-full text-xs">
          <thead className="text-secondary-fg">
            <tr>
              <th className="text-left px-3 py-2">Tail</th>
              <th className="text-left px-3 py-2">Model</th>
              <th className="text-left px-3 py-2">ICAO24 hex</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Alt (m)</th>
              <th className="text-left px-3 py-2">GS (m/s)</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-4 text-center text-secondary-fg">Polling network…</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.tail} className="border-t border-border-subtle">
                <td className="px-3 py-2 font-mono text-primary-fg">{r.tail}</td>
                <td className="px-3 py-2 text-primary-fg">{r.model}</td>
                <td className="px-3 py-2 font-mono text-secondary-fg">{r.hex ?? <span className="text-amber-300">— add hex</span>}</td>
                <td className="px-3 py-2">
                  {r.tracked
                    ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />TRACKED</span>
                    : <span className="inline-flex items-center gap-1 text-secondary-fg"><EyeOff className="w-3.5 h-3.5" />DARK</span>}
                </td>
                <td className="px-3 py-2 font-mono text-primary-fg">{r.alt ? Math.round(r.alt) : "—"}</td>
                <td className="px-3 py-2 font-mono text-primary-fg">{r.gs ? Math.round(r.gs) : "—"}</td>
              </tr>
            ))}
            {!loading && !rows.length && <tr><td colSpan={6} className="p-4 text-center text-secondary-fg">No aircraft in this org yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <p className="text-[11px] text-secondary-fg">Tails without an ICAO24 hex cannot match to network data. Add the hex on the aircraft record to bring them into coverage.</p>
    </div>
  );
}
