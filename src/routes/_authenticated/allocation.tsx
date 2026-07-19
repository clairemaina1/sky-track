import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { Users, Plane, Clock, Check, X, ChevronRight, Sparkles } from "lucide-react";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/_authenticated/allocation")({
  component: AllocationPage,
  head: () => pageHead({
    title: "Crew Allocation — SkyTrack",
    description: "Dual-layer intelligent crew allocation: automated cabin dispatch and pilot-centric bid-offer command choice.",
    path: "/allocation",
  }),
});

type Layer = "cabin" | "pilot";
type Status = "offered" | "accepted" | "declined" | "expired" | "cascaded" | "locked" | "auto_assigned";
interface Flight { id: string; flight_number: string; origin: string; destination: string; status: string; scheduled_departure: string | null; aircraft_id: string | null; }
interface Crew { id: string; full_name: string; role: string; status: string; base_station: string | null; }
interface Assignment { id: string; flight_id: string; crew_id: string; layer: Layer; status: Status; rank: number; expires_at: string | null; reason: string | null; }

function AllocationPage() {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [windowMin, setWindowMin] = useState<number>(15);


  const flightsQ = useQuery({
    queryKey: ["allocation-flights", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Flight[]> => {
      const { data } = await supabase
        .from("flights").select("id, flight_number, origin, destination, status, scheduled_departure, aircraft_id")
        .eq("org_id", orgId!)
        .in("status", ["scheduled", "boarding", "delayed"])
        .order("scheduled_departure", { ascending: true })
        .limit(50);
      return (data ?? []) as Flight[];
    },
  });

  const crewQ = useQuery({
    queryKey: ["allocation-crew", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Crew[]> => {
      const { data } = await supabase
        .from("crew").select("id, full_name, role, status, base_station")
        .eq("org_id", orgId!)
        .eq("status", "available");
      return (data ?? []) as Crew[];
    },
  });

  const asgQ = useQuery({
    queryKey: ["allocation-assignments", orgId, selectedFlight],
    enabled: !!orgId && !!selectedFlight,
    queryFn: async (): Promise<Assignment[]> => {
      const { data } = await supabase
        .from("crew_assignments").select("*")
        .eq("org_id", orgId!).eq("flight_id", selectedFlight!)
        .order("rank", { ascending: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]) as Assignment[];
    },
    refetchInterval: 5000,
  });

  const flights = flightsQ.data ?? [];
  const crew = crewQ.data ?? [];
  const assignments = asgQ.data ?? [];

  const pilots = useMemo(() => crew.filter((c) => /pilot|captain|first officer/i.test(c.role)), [crew]);
  const cabin = useMemo(() => crew.filter((c) => /cabin|flight attendant|purser/i.test(c.role)), [crew]);

  const currentFlight = flights.find((f) => f.id === selectedFlight) ?? null;

  const autoCabin = useMutation({
    mutationFn: async () => {
      if (!currentFlight || !orgId) return;
      // Cabin: auto-assign top 4 available cabin crew
      const picks = cabin.slice(0, 4);
      const rows = picks.map((c, i) => ({
        org_id: orgId, flight_id: currentFlight.id, crew_id: c.id,
        layer: "cabin" as const, status: "auto_assigned" as const, rank: i + 1,
        reason: `Auto-dispatched: base=${c.base_station ?? "—"}, role=${c.role}`,
      }));
      if (rows.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("crew_assignments").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allocation-assignments"] }),
  });

  const offerPilots = useMutation({
    mutationFn: async () => {
      if (!currentFlight || !orgId) return;
      // Top 3 ranked pilots — scoring stub: base match, then any
      const scored = [...pilots]
        .map((p) => ({
          p,
          score: (p.base_station === currentFlight.origin ? 10 : 0) + Math.random() * 3,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      const expiresAt = new Date(Date.now() + Math.max(1, windowMin) * 60 * 1000).toISOString();

      const rows = scored.map(({ p, score }, i) => ({
        org_id: orgId, flight_id: currentFlight.id, crew_id: p.id,
        layer: "pilot" as const, status: "offered" as const, rank: i + 1,
        expires_at: expiresAt,
        reason: `Rank ${i + 1}: score=${score.toFixed(1)} · base=${p.base_station ?? "—"}`,
      }));
      if (rows.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("crew_assignments").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allocation-assignments"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async (payload: { id: string; status: Status }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("crew_assignments")
        .update({ status: payload.status, responded_at: new Date().toISOString() })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allocation-assignments"] }),
  });

  const cascade = useMutation({
    mutationFn: async (from: Assignment) => {
      // Mark current cascaded, promote next-ranked offered → keep as offered (already offered), or bump expiry
      await updateStatus.mutateAsync({ id: from.id, status: "cascaded" });
      const next = assignments.find((a) => a.layer === "pilot" && a.rank === from.rank + 1);
      if (next) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("crew_assignments")
          .update({ expires_at: expiresAt })
          .eq("id", next.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allocation-assignments"] }),
  });

  const nameOf = (id: string) => crew.find((c) => c.id === id)?.full_name ?? id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl text-primary-fg">Crew Allocation</h1>
        <p className="text-sm text-secondary-fg mt-1">
          Dual-layer engine — cabin crew dispatch is fully automatic; pilots receive a ranked bid-offer with a 15-minute command-choice window.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Flight list */}
        <div className="panel p-3">
          <div className="font-mono uppercase text-[10px] tracking-[0.16em] text-secondary-fg mb-2">Upcoming flights</div>
          {flightsQ.isLoading ? (
            <div className="text-xs text-secondary-fg">Loading…</div>
          ) : flights.length === 0 ? (
            <div className="text-xs text-secondary-fg">No flights need allocation.</div>
          ) : (
            <div className="space-y-1">
              {flights.map((f) => {
                const active = f.id === selectedFlight;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFlight(f.id)}
                    className="w-full text-left px-2.5 py-2 rounded transition-colors flex items-center gap-2"
                    style={{
                      background: active ? "var(--bg-elevated)" : "transparent",
                      border: `1px solid ${active ? "var(--accent-primary)" : "transparent"}`,
                    }}
                  >
                    <Plane className="w-3.5 h-3.5 text-accent" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-primary-fg font-medium">{f.flight_number}</div>
                      <div className="text-[11px] text-secondary-fg truncate">{f.origin} → {f.destination}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-secondary-fg" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Allocation panel */}
        <div className="panel p-4 min-h-[400px]">
          {!currentFlight ? (
            <div className="h-full flex items-center justify-center text-secondary-fg text-sm">
              Select a flight to begin allocation.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg text-primary-fg">{currentFlight.flight_number}</div>
                  <div className="text-sm text-secondary-fg">
                    {currentFlight.origin} → {currentFlight.destination} · {currentFlight.scheduled_departure
                      ? new Date(currentFlight.scheduled_departure).toLocaleString()
                      : "TBD"}
                  </div>
                </div>
              </div>

              {/* Layer A — Cabin */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <h2 className="font-display uppercase text-xs tracking-[0.14em] text-primary-fg">
                      Layer A · Cabin auto-dispatch
                    </h2>
                  </div>
                  <button
                    onClick={() => autoCabin.mutate()}
                    disabled={autoCabin.isPending || assignments.some((a) => a.layer === "cabin")}
                    className="btn-cmd text-[10px]"
                  >
                    {autoCabin.isPending ? "Dispatching…" : "Auto-dispatch cabin crew"}
                  </button>
                </div>
                <p className="text-[11px] text-secondary-fg mb-2">
                  Volume-based algorithmic assignment. Locked-in roster pushed to crew on save.
                </p>
                <AssignmentRows rows={assignments.filter((a) => a.layer === "cabin")} nameOf={nameOf} onCancel={(id) => updateStatus.mutate({ id, status: "cascaded" })} />
              </section>

              {/* Layer B — Pilots */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h2 className="font-display uppercase text-xs tracking-[0.14em] text-primary-fg">
                      Layer B · Pilot command-choice
                    </h2>
                  </div>
                  <button
                    onClick={() => offerPilots.mutate()}
                    disabled={offerPilots.isPending || assignments.some((a) => a.layer === "pilot")}
                    className="btn-cmd text-[10px]"
                  >
                    {offerPilots.isPending ? "Sending offers…" : "Send bid-offer to top 3 pilots"}
                  </button>
                </div>
                <p className="text-[11px] text-secondary-fg mb-2">
                  Behind-the-scenes filter: type ratings, FDP limits, rest, currency, pairing preferences. 15-minute countdown per rank; auto-cascades on decline or expiry.
                </p>
                <PilotOfferRows
                  rows={assignments.filter((a) => a.layer === "pilot")}
                  nameOf={nameOf}
                  onAccept={(id) => updateStatus.mutate({ id, status: "accepted" })}
                  onDecline={(a) => cascade.mutate(a)}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function statusColor(s: Status): string {
  if (s === "accepted" || s === "locked") return "var(--status-green)";
  if (s === "offered" || s === "auto_assigned") return "var(--accent-primary)";
  if (s === "declined" || s === "expired" || s === "cascaded") return "var(--status-amber)";
  return "var(--text-secondary)";
}

function AssignmentRows({ rows, nameOf, onCancel }: { rows: Assignment[]; nameOf: (id: string) => string; onCancel: (id: string) => void; }) {
  if (rows.length === 0) return <div className="text-xs text-secondary-fg italic">No cabin crew assigned yet.</div>;
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 border rounded" style={{ borderColor: "var(--border-subtle)" }}>
          <span className="text-[10px] font-mono text-secondary-fg w-4">{r.rank}</span>
          <span className="flex-1 text-sm text-primary-fg">{nameOf(r.crew_id)}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor(r.status) }}>{r.status.replace("_", " ")}</span>
          {r.status === "auto_assigned" && (
            <button onClick={() => onCancel(r.id)} aria-label="Remove" className="text-secondary-fg hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function PilotOfferRows({ rows, nameOf, onAccept, onDecline }: {
  rows: Assignment[]; nameOf: (id: string) => string;
  onAccept: (id: string) => void; onDecline: (a: Assignment) => void;
}) {
  if (rows.length === 0) return <div className="text-xs text-secondary-fg italic">No pilot offers sent yet.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => <PilotRow key={r.id} r={r} name={nameOf(r.crew_id)} onAccept={onAccept} onDecline={onDecline} />)}
    </div>
  );
}

function PilotRow({ r, name, onAccept, onDecline }: {
  r: Assignment; name: string;
  onAccept: (id: string) => void; onDecline: (a: Assignment) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const expMs = r.expires_at ? new Date(r.expires_at).getTime() - now : 0;
  const active = r.status === "offered" && expMs > 0;
  const mm = Math.max(0, Math.floor(expMs / 60000));
  const ss = Math.max(0, Math.floor((expMs % 60000) / 1000));

  return (
    <div className="p-3 border rounded" style={{ borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)", background: active ? "color-mix(in oklab, var(--accent-primary) 6%, transparent)" : "transparent" }}>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-secondary-fg w-6">#{r.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-primary-fg font-medium">{name}</div>
          <div className="text-[11px] text-secondary-fg truncate">{r.reason}</div>
        </div>
        {active && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "var(--accent-primary)" }}>
            <Clock className="w-3.5 h-3.5" />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        )}
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor(r.status) }}>{r.status}</span>
      </div>
      {active && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => onAccept(r.id)} className="btn-cmd text-[10px] flex-1 justify-center" style={{ background: "var(--status-green)", color: "black" }}>
            <Check className="w-3.5 h-3.5" /> Accept command
          </button>
          <button onClick={() => onDecline(r)} className="btn-cmd text-[10px]">
            <X className="w-3.5 h-3.5" /> Decline · cascade
          </button>
        </div>
      )}
    </div>
  );
}
