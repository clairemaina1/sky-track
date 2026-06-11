// ICAO Carbon Calculator — Doc 9501 methodology
// CO₂ (kg) = Fuel Burn (kg) × Emission Factor
export type FuelType = "Jet_A1" | "Jet_A" | "Avgas_100LL" | "SAF" | "Blended_SAF";

const EMISSION_FACTORS: Record<FuelType, number> = {
  Jet_A1: 3.16,
  Jet_A: 3.16,
  Avgas_100LL: 3.1,
  SAF: 0.15,
  Blended_SAF: 3.16, // overridden by blend interpolation
};

export interface CarbonInput {
  fuelBurnKg: number;
  fuelType: FuelType;
  safBlendPct?: number;
  offsetKg?: number;
  paxCount?: number;
  distanceNm?: number;
}

export interface CarbonResult {
  grossCO2Kg: number;
  offsetKg: number;
  netCO2Kg: number;
  emissionFactor: number;
  safSavingKg: number;
  co2PerPax?: number;
  co2PerNm?: number;
  grossCO2Tonnes: number;
  netCO2Tonnes: number;
  methodology: string;
}

export function calculateCarbon(input: CarbonInput): CarbonResult {
  const { fuelBurnKg, fuelType, safBlendPct = 0, offsetKg = 0, paxCount, distanceNm } = input;
  let ef = EMISSION_FACTORS[fuelType];
  let safSavingKg = 0;

  if (fuelType === "Blended_SAF") {
    const pct = Math.max(0, Math.min(100, safBlendPct)) / 100;
    ef = EMISSION_FACTORS.Jet_A1 * (1 - pct) + EMISSION_FACTORS.SAF * pct;
    safSavingKg = fuelBurnKg * (EMISSION_FACTORS.Jet_A1 - ef);
  } else if (fuelType === "SAF") {
    safSavingKg = fuelBurnKg * (EMISSION_FACTORS.Jet_A1 - EMISSION_FACTORS.SAF);
  }

  const grossCO2Kg = fuelBurnKg * ef;
  const netCO2Kg = Math.max(0, grossCO2Kg - offsetKg);

  return {
    grossCO2Kg,
    offsetKg,
    netCO2Kg,
    emissionFactor: ef,
    safSavingKg,
    co2PerPax: paxCount ? netCO2Kg / paxCount : undefined,
    co2PerNm: distanceNm ? netCO2Kg / distanceNm : undefined,
    grossCO2Tonnes: grossCO2Kg / 1000,
    netCO2Tonnes: netCO2Kg / 1000,
    methodology: "ICAO Doc 9501 · Carbon Calculator v12",
  };
}
