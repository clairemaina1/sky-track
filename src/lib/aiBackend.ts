// Mock AI backend interface — matches future FastAPI shape.
const BASE = "http://localhost:8000/api";

async function call<T>(_path: string, _payload: unknown, mock: T): Promise<T> {
  // Future: return fetch(`${BASE}${_path}`, { method: "POST", body: JSON.stringify(_payload) }).then(r => r.json());
  void BASE;
  await new Promise((r) => setTimeout(r, 120));
  return mock;
}

export interface PredictionResult {
  estimatedRulHours: number;
  estimatedRulDays: number;
  criticalDate: string;
  confidence: number;
}

export function callPredictionEngine(payload: {
  aircraftId: string;
  currentHealth: number;
  flightHoursTotal: number;
}): Promise<PredictionResult> {
  const decay = 0.002;
  const targetHealth = 10;
  const hoursToCritical = Math.max(
    0,
    Math.log(payload.currentHealth / targetHealth) / decay,
  );
  const days = hoursToCritical / 6; // ~6 flight hrs/day
  return call("/predict", payload, {
    estimatedRulHours: Math.round(hoursToCritical),
    estimatedRulDays: Math.round(days),
    criticalDate: new Date(Date.now() + days * 86400000).toISOString(),
    confidence: 0.87,
  });
}

export interface RouteOption {
  id: string;
  label: string;
  fuelKg: number;
  durationMin: number;
  waypoints: string[];
  recommended?: boolean;
}

export function callRouteOptimizer(
  origin: string,
  destination: string,
  baselineFuelKg: number,
  baselineDurationMin: number,
): Promise<RouteOption[]> {
  return call("/optimize-route", { origin, destination }, [
    {
      id: "A",
      label: "Direct (baseline)",
      fuelKg: baselineFuelKg,
      durationMin: baselineDurationMin,
      waypoints: [origin, destination],
    },
    {
      id: "B",
      label: "Via alternate waypoint",
      fuelKg: Math.round(baselineFuelKg * 0.95),
      durationMin: baselineDurationMin + 20,
      waypoints: [origin, "ALT-WP", destination],
    },
    {
      id: "C",
      label: "Altitude-optimized",
      fuelKg: Math.round(baselineFuelKg * 0.88),
      durationMin: baselineDurationMin + 35,
      waypoints: [origin, "FL410", destination],
      recommended: true,
    },
  ]);
}

export interface CrewMatch {
  crewId: string;
  score: number;
  reasons: string[];
}

export function callCrewOptimizer(flightId: string, crewIds: string[]): Promise<CrewMatch[]> {
  return call(
    "/optimize-crew",
    { flightId, crewIds },
    crewIds.slice(0, 3).map((id, i) => ({
      crewId: id,
      score: 90 - i * 7,
      reasons: ["Type-rated", "Duty-time within limits"],
    })),
  );
}
