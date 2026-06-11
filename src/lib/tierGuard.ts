// ─────────────────────────────────────────────────────────────
// SkyTrack — Tier Guard
// Central authority for platform-tier + role-based gating.
// Single source of truth for the sidebar manifest.
// ─────────────────────────────────────────────────────────────

export type PlatformTier = "flight_school" | "commercial_airline";

// Aligned with the public.app_role enum in the database.
export type UserRole = "crew" | "maintenance" | "dispatcher" | "admin";

export type NavItemId =
  | "command"
  | "fleet"
  | "mro"
  | "crew"
  | "disruption"
  | "routing"
  | "cargo"
  | "training"
  | "scheduling"
  | "settings";

export interface NavItem {
  id: NavItemId;
  label: string;
  to: string;
  icon: string; // lucide icon name resolved in Sidebar
  description: string;
  exact?: boolean;
  allowedTiers: PlatformTier[];
  minimumRole: UserRole;
  groupStart?: boolean;
  badge?: "AI" | "ICAO" | "School" | "New";
}

// Role weights — higher = more privileged
const ROLE_WEIGHT: Record<UserRole, number> = {
  crew: 0,
  maintenance: 1,
  dispatcher: 2,
  admin: 3,
};

export function roleHasAccess(user: UserRole, minimum: UserRole): boolean {
  return ROLE_WEIGHT[user] >= ROLE_WEIGHT[minimum];
}

// Master navigation manifest — wired to existing routes
export const NAV_MANIFEST: NavItem[] = [
  {
    id: "command",
    label: "Command",
    to: "/",
    icon: "LayoutDashboard",
    description: "Operational summary & live KPIs",
    exact: true,
    allowedTiers: ["flight_school", "commercial_airline"],
    minimumRole: "crew",
  },
  {
    id: "fleet",
    label: "Fleet",
    to: "/fleet",
    icon: "Plane",
    description: "Aircraft registry, status & health",
    allowedTiers: ["flight_school", "commercial_airline"],
    minimumRole: "crew",
    groupStart: true,
  },
  {
    id: "mro",
    label: "MRO",
    to: "/mro",
    icon: "Wrench",
    description: "Work orders, RUL & AOG",
    allowedTiers: ["flight_school", "commercial_airline"],
    minimumRole: "maintenance",
  },
  {
    id: "crew",
    label: "Crew",
    to: "/crew",
    icon: "Users",
    description: "Roster, duty hours & certifications",
    allowedTiers: ["flight_school", "commercial_airline"],
    minimumRole: "crew",
  },
  {
    id: "routing",
    label: "Routing",
    to: "/routing",
    icon: "Map",
    description: "Live ops map & fuel simulator",
    allowedTiers: ["flight_school", "commercial_airline"],
    minimumRole: "dispatcher",
    groupStart: true,
  },
  {
    id: "cargo",
    label: "Cargo",
    to: "/cargo",
    icon: "Package",
    description: "Manifest & load planning",
    allowedTiers: ["commercial_airline"],
    minimumRole: "dispatcher",
  },
  {
    id: "disruption",
    label: "Disruption AI",
    to: "/disruption",
    icon: "Zap",
    description: "AI recovery plans for IRROPs",
    allowedTiers: ["commercial_airline"],
    minimumRole: "dispatcher",
    badge: "AI",
  },
  {
    id: "training",
    label: "Training",
    to: "/training",
    icon: "GraduationCap",
    description: "Student progress & endorsements",
    allowedTiers: ["flight_school"],
    minimumRole: "crew",
    groupStart: true,
    badge: "School",
  },
  {
    id: "scheduling",
    label: "Scheduling",
    to: "/scheduling",
    icon: "CalendarDays",
    description: "Instructor & aircraft booking",
    allowedTiers: ["flight_school"],
    minimumRole: "dispatcher",
  },
];

export function getPermittedNavItems(tier: PlatformTier, role: UserRole): NavItem[] {
  return NAV_MANIFEST.filter(
    (i) => i.allowedTiers.includes(tier) && roleHasAccess(role, i.minimumRole),
  );
}

export function isRoutePermitted(id: NavItemId, tier: PlatformTier, role: UserRole): boolean {
  const item = NAV_MANIFEST.find((n) => n.id === id);
  if (!item) return false;
  return item.allowedTiers.includes(tier) && roleHasAccess(role, item.minimumRole);
}

export function getTierMeta(tier: PlatformTier) {
  if (tier === "commercial_airline") {
    return {
      label: "Commercial Ops",
      sublabel: "Airline Mode",
      color: "var(--accent-primary)",
    };
  }
  return {
    label: "Flight Training",
    sublabel: "School Mode",
    color: "var(--accent-gold)",
  };
}
