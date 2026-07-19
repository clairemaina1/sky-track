import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PitchMetrics {
  org_name: string;
  fleet_size: number;
  aircraft_status: Record<string, number>;
  flights_30d: number;
  on_time_pct: number;
  crew_count: number;
  cargo_tonnes: number;
  co2_tonnes_30d: number;
  aog_current: number;
  open_maintenance: number;
  generated_at: string;
}

export const getPitchMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string }) => input)
  .handler(async ({ data, context }): Promise<PitchMetrics> => {
    const s = context.supabase;
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [orgRes, acRes, flightRes, crewRes, cargoRes, mroRes] = await Promise.all([
      s.from("organizations").select("name").eq("id", data.orgId).maybeSingle(),
      s.from("aircraft").select("id, status").eq("org_id", data.orgId),
      s.from("flights").select("id, status, actual_departure, scheduled_departure, distance_nm").eq("org_id", data.orgId).gte("scheduled_departure", since),
      s.from("crew").select("id").eq("org_id", data.orgId),
      s.from("cargo").select("weight_kg").eq("org_id", data.orgId).gte("created_at", since),
      s.from("maintenance").select("id, status").eq("org_id", data.orgId),
    ]);

    const aircraft = acRes.data ?? [];
    const status: Record<string, number> = {};
    for (const a of aircraft as { status: string }[]) status[a.status] = (status[a.status] ?? 0) + 1;

    const flights = (flightRes.data ?? []) as { status: string; actual_departure: string | null; scheduled_departure: string | null; distance_nm: number | null }[];
    const done = flights.filter((f) => f.actual_departure && f.scheduled_departure);
    const onTime = done.filter((f) => {
      const drift = new Date(f.actual_departure!).getTime() - new Date(f.scheduled_departure!).getTime();
      return drift <= 15 * 60_000;
    }).length;
    const onTimePct = done.length ? Math.round((onTime / done.length) * 100) : 0;

    // Rough CO2: 3.16 kg CO2 per kg jet fuel; assume 2500 kg/hr burn, ~450 kt cruise → per NM ≈ 5.55 kg CO2.
    const nm = flights.reduce((sum, f) => sum + (f.distance_nm ?? 0), 0);
    const co2Tonnes = Math.round((nm * 5.55) / 1000);

    const cargoKg = (cargoRes.data ?? []).reduce((sum, c: { weight_kg: number | null }) => sum + (c.weight_kg ?? 0), 0);

    const mro = (mroRes.data ?? []) as { status: string }[];
    const openMx = mro.filter((m) => m.status !== "closed" && m.status !== "completed").length;

    return {
      org_name: orgRes.data?.name ?? "Your Airline",
      fleet_size: aircraft.length,
      aircraft_status: status,
      flights_30d: flights.length,
      on_time_pct: onTimePct,
      crew_count: (crewRes.data ?? []).length,
      cargo_tonnes: Math.round(cargoKg / 1000),
      co2_tonnes_30d: co2Tonnes,
      aog_current: status["aog"] ?? 0,
      open_maintenance: openMx,
      generated_at: new Date().toISOString(),
    };
  });
