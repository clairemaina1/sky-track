// Per-tenant product variants. Drives sidebar visibility, brand chip, and
// landing pitch so KQ, Emirates, KCAA, and flight-school demos feel distinct.
export type ProductProfile =
  | "airline_ops"
  | "widebody_intl"
  | "regulator"
  | "flight_school"
  | "cargo_ops"
  | "generic";

export interface ProfileMeta {
  id: ProductProfile;
  brand: string;      // Sidebar wordmark suffix, e.g. "SKYTRACK · Airline Ops"
  headline: string;   // One-line landing pitch
  accent: string;     // CSS color for the brand chip
  hides: string[];    // Route paths to hide in the sidebar (case-insensitive prefix match)
  featured: string[]; // Route paths to promote to the top
}

export const PROFILE_META: Record<ProductProfile, ProfileMeta> = {
  airline_ops: {
    id: "airline_ops",
    brand: "Airline Ops",
    headline: "Narrow-body scheduled ops — dispatch, crew, MRO, on-time.",
    accent: "#3DD9FF",
    hides: ["/logbook"],
    featured: ["/flights", "/allocation", "/tracker", "/mro"],
  },
  widebody_intl: {
    id: "widebody_intl",
    brand: "Wide-body International",
    headline: "Long-haul, multi-fleet, CORSIA & fuel-burn intelligence.",
    accent: "#F5C542",
    hides: ["/logbook"],
    featured: ["/tracker", "/fuel-burn", "/carbon", "/regulator"],
  },
  regulator: {
    id: "regulator",
    brand: "Regulator",
    headline: "Cross-operator oversight — Annex 6, credentials, safety events.",
    accent: "#7DE28C",
    hides: ["/marketplace", "/allocation", "/fuel-burn", "/pitch"],
    featured: ["/regulator", "/audit", "/approvals", "/superadmin"],
  },
  flight_school: {
    id: "flight_school",
    brand: "Flight Schools",
    headline: "Trainer fleet, student logbook, instructor rostering.",
    accent: "#B58BFF",
    hides: ["/allocation", "/marketplace", "/fuel-burn", "/regulator"],
    featured: ["/logbook", "/crew", "/fleet", "/tracker"],
  },
  cargo_ops: {
    id: "cargo_ops",
    brand: "Cargo",
    headline: "Freighter capacity, load planning, cargo tracking.",
    accent: "#FF9B57",
    hides: ["/logbook"],
    featured: ["/cargo", "/flights", "/tracker", "/fuel-burn"],
  },
  generic: {
    id: "generic",
    brand: "Operations Suite",
    headline: "Full aviation ops platform.",
    accent: "#3DD9FF",
    hides: [],
    featured: [],
  },
};

export function getProfileMeta(p?: string | null): ProfileMeta {
  const key = (p ?? "generic") as ProductProfile;
  return PROFILE_META[key] ?? PROFILE_META.generic;
}
