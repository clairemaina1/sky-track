// Simplified major FIR / airway boundary hints — public-domain approximate
// coordinates for a sectional-chart aesthetic. Not for navigation.
export const FIR_LINES: [number, number][][] = [
  // Nairobi FIR (HKNA) rough outline
  [[5, 33], [5, 42], [-5, 42], [-5, 33], [5, 33]],
  // Johannesburg FIR (FAJO) rough
  [[-22, 16], [-22, 33], [-35, 33], [-35, 18], [-22, 16]],
  // Kano FIR (DNKK) rough
  [[15, 3], [15, 15], [4, 15], [4, 3], [15, 3]],
  // Cairo FIR (HECC) rough
  [[32, 25], [32, 37], [22, 37], [22, 25], [32, 25]],
  // Trans-African airway hint (UA6 / UM731 corridor)
  [[36.9, -1.3], [15.5, 32.5], [30.1, 31.4], [25.2, 55.3]],
  // North Atlantic Track hint
  [[51.5, -0.5], [40.6, -73.8]],
];

// Major VOR-like reference points (rough) — hub airports we style as compass roses.
export const VOR_HUBS: { id: string; pos: [number, number]; name: string }[] = [
  { id: "NV", pos: [-1.319, 36.927], name: "NAIROBI" },
  { id: "JN", pos: [-26.139, 28.246], name: "JOHANNESBURG" },
  { id: "DX", pos: [25.253, 55.365], name: "DUBAI" },
  { id: "LN", pos: [51.477, -0.461], name: "LONDON" },
  { id: "CA", pos: [30.121, 31.406], name: "CAIRO" },
];
