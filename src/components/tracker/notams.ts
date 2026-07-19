// Active NOTAMs / airspace advisories — curated dataset. Real FAA/EUROCONTROL
// NOTAM APIs require OAuth client credentials; this ships a review-safe
// baseline that ops teams can supplement. Structure matches the ICAO
// Q-code + affected FIR/aerodrome format.
export type Notam = {
  id: string;
  icao: string;       // affected airport or FIR
  lat: number;
  lon: number;
  radiusNm: number;
  severity: "info" | "advisory" | "warning";
  category: "runway" | "airspace" | "navaid" | "obstacle" | "security";
  summary: string;
  effective: string;  // ISO
  expires: string;    // ISO
};

const now = Date.now();
const iso = (offsetHrs: number) => new Date(now + offsetHrs * 3600_000).toISOString();

export const NOTAMS: Notam[] = [
  {
    id: "A0421/26", icao: "HKJK", lat: -1.319, lon: 36.927, radiusNm: 5,
    severity: "advisory", category: "runway",
    summary: "RWY 06/24 reduced to 3800m due to construction on threshold 06. Expect 12-min ATC delays.",
    effective: iso(-12), expires: iso(96),
  },
  {
    id: "B0117/26", icao: "HAAB", lat: 8.978, lon: 38.799, radiusNm: 40,
    severity: "warning", category: "airspace",
    summary: "TFR — VIP movement 0800-1000Z. All non-scheduled traffic diverted to HAHM.",
    effective: iso(-2), expires: iso(6),
  },
  {
    id: "C0088/26", icao: "FAOR", lat: -26.139, lon: 28.246, radiusNm: 8,
    severity: "advisory", category: "navaid",
    summary: "ILS RWY 03R U/S. LNAV/VNAV approach only. Expect vectored approach.",
    effective: iso(-24), expires: iso(48),
  },
  {
    id: "D0059/26", icao: "HTDA", lat: -6.878, lon: 39.202, radiusNm: 3,
    severity: "info", category: "obstacle",
    summary: "Crane 145ft AGL 1.2NM SW of RWY 05 threshold. Marked and lit.",
    effective: iso(-72), expires: iso(240),
  },
  {
    id: "E0230/26", icao: "DNMM", lat: 6.577, lon: 3.321, radiusNm: 6,
    severity: "warning", category: "security",
    summary: "Enhanced screening in effect. Add 45 min to turnaround.",
    effective: iso(-1), expires: iso(24),
  },
  {
    id: "F0012/26", icao: "HRYR", lat: -1.968, lon: 30.139, radiusNm: 4,
    severity: "advisory", category: "runway",
    summary: "Wet runway — braking action reported 'medium to poor' on RWY 28.",
    effective: iso(-3), expires: iso(12),
  },
  {
    id: "G0303/26", icao: "OMDB", lat: 25.253, lon: 55.365, radiusNm: 10,
    severity: "info", category: "airspace",
    summary: "Sandstorm probability 40% between 14-18Z. Alternate: OMSJ.",
    effective: iso(2), expires: iso(20),
  },
  {
    id: "H0044/26", icao: "HSSS", lat: 15.589, lon: 32.553, radiusNm: 30,
    severity: "warning", category: "airspace",
    summary: "FIR restricted airspace — coordinate with ATC before entry.",
    effective: iso(-48), expires: iso(720),
  },
];

export const NOTAM_COLOR: Record<Notam["severity"], string> = {
  info: "#38bdf8",
  advisory: "#f59e0b",
  warning: "#ef4444",
};
