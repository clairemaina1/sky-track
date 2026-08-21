import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  Map as MapIcon,
  Package,
  Zap,
  Leaf,
  GraduationCap,
  CalendarDays,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  BookOpen,
  Inbox,
  ShieldAlert,
  UserCheck,
  Plug,
  Radar,
  Flame,
  FlaskConical,
  Handshake,
  FileCheck2,
  Activity,
  Upload,
  Palette,
  CloudRain,
  FileText,
  Presentation,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { getProfileMeta } from "@/lib/product-profile";
import { useCurrentOrg, useResolvedTier } from "@/hooks/use-org";
import { supabase } from "@/integrations/supabase/client";
import { SkytrackLogo } from "@/components/brand/SkytrackLogo";
import { useCurrentCategory, useSuperAdmin, CATEGORY_LABEL, CATEGORY_ACCENT } from "@/hooks/use-category";
import {
  getPermittedNavItems,
  getTierMeta,
  type NavItem,
  type PlatformTier,
  type UserRole,
} from "@/lib/tierGuard";
import { useTranslation } from "react-i18next";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  Map: MapIcon,
  Package,
  Zap,
  Leaf,
  GraduationCap,
  CalendarDays,
  SlidersHorizontal,
};

const BADGE_STYLES: Record<NonNullable<NavItem["badge"]>, string> = {
  AI: "border-violet-400/40 text-violet-300 bg-violet-500/10",
  ICAO: "border-emerald-400/40 text-emerald-300 bg-emerald-500/10",
  School: "border-sky-400/40 text-sky-300 bg-sky-500/10",
  New: "border-amber-400/40 text-amber-300 bg-amber-500/10",
};

// Tier is server-of-record from the org row; never trusted from the browser.

type Entry = {
  to: string;
  icon: LucideIcon;
  label: string;
  title?: string;
  badge?: NavItem["badge"];
  exact?: boolean;
  accent?: string;
};

type Section = { id: string; label: string; entries: Entry[] };

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function Sidebar({
  onNavigate,
  forceExpanded = false,
}: { onNavigate?: () => void; forceExpanded?: boolean } = {}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  const tr = (id: string, fallback: string) => {
    const k = `nav.${id}`;
    const v = t(k);
    return v === k ? fallback : v;
  };

  const currentOrg = useCurrentOrg();
  const tier: PlatformTier = useResolvedTier();
  const profile = getProfileMeta(currentOrg?.product_profile);
  const isHidden = (to: string) => profile.hides.some((h) => to.toLowerCase().startsWith(h.toLowerCase()));
  const [category] = useCurrentCategory();
  const { data: isSuper = false } = useSuperAdmin();
  const [collapsedState, setCollapsed] = useState(false);
  const collapsed = forceExpanded ? false : collapsedState;
  const [role, setRole] = useState<UserRole>("crew");
  const [displayName, setDisplayName] = useState("Operator");
  const [orgName, setOrgName] = useState("SkyTrack");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!mounted || !u.user) return;

      const email = u.user.email ?? "";
      setDisplayName(
        (u.user.user_metadata?.full_name as string | undefined)?.trim() ||
          email.split("@")[0] ||
          "Operator",
      );
      setOrgName(email.split("@")[1]?.split(".")[0]?.toUpperCase() || "SkyTrack");

      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);

      if (!mounted) return;
      const roles = (rows ?? []).map((r) => r.role as UserRole);
      const ranked: UserRole[] = ["admin", "dispatcher", "maintenance", "crew"];
      const best = ranked.find((r) => roles.includes(r)) ?? "crew";
      setRole(best);
    })();

    // Auto-collapse on narrow viewports
    function onResize() {
      if (window.innerWidth < 1280) setCollapsed(true);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const items = getPermittedNavItems(tier, role);
  const tierMeta = getTierMeta(tier);
  const isOrgAdmin = currentOrg?.role === "admin" || isSuper;

  const sections: Section[] = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i] as const));
    const manifest = (id: string): Entry | null => {
      const it = byId.get(id as never);
      if (!it || isHidden(it.to)) return null;
      return {
        to: it.to,
        icon: ICONS[it.icon] ?? LayoutDashboard,
        label: tr(it.id, it.label),
        title: it.description,
        badge: it.badge,
        exact: it.exact,
      };
    };
    const extra = (to: string, icon: LucideIcon, label: string, opts: Partial<Entry> = {}): Entry | null =>
      isHidden(to) ? null : { to, icon, label, ...opts };

    const isSchool = category === "flight_school" || currentOrg?.product_profile === "flight_school";

    const raw: Section[] = [
      {
        id: "overview",
        label: tr("group_overview", "Overview"),
        entries: [manifest("command")],
      },
      {
        id: "fleet",
        label: tr("group_fleet", "Fleet & Maintenance"),
        entries: [
          manifest("fleet"),
          manifest("mro"),
          extra("/predictive", Activity, tr("predictive", "Predictive")),
          extra("/adsb-status", Radar, tr("adsb", "ADS-B Status")),
        ],
      },
      {
        id: "ops",
        label: tr("group_ops", "Flight Operations"),
        entries: [
          extra("/tracker", Radar, tr("tracker", "Live Tracker")),
          manifest("routing"),
          manifest("scheduling"),
          manifest("disruption"),
          extra("/weather-risk", CloudRain, tr("wx_risk", "Weather Risk")),
          extra("/simulator", FlaskConical, tr("simulator", "What-If Sim")),
        ],
      },
      {
        id: "people",
        label: tr("group_people", "Crew & Training"),
        entries: [
          manifest("crew"),
          role === "admin" || role === "dispatcher"
            ? extra("/allocation", UserCheck, tr("allocation", "Allocation"))
            : null,
          manifest("training"),
          isSchool ? extra("/logbook", BookOpen, tr("logbook", "Logbook")) : null,
        ],
      },
      {
        id: "commercial",
        label: tr("group_commercial", "Cargo & Commercial"),
        entries: [
          manifest("cargo"),
          extra("/marketplace", Handshake, tr("marketplace", "Marketplace")),
          extra("/fuel-burn", Flame, tr("fuel_burn", "Fuel Burn")),
        ],
      },
      {
        id: "compliance",
        label: tr("group_compliance", "Compliance & Sustainability"),
        entries: [
          manifest("carbon"),
          extra("/regulator", FileCheck2, tr("regulator", "Regulator Export")),
          isOrgAdmin ? extra("/audit", FileText, tr("audit", "Audit & DPA")) : null,
          isOrgAdmin ? extra("/approvals", Inbox, tr("approvals", "Approvals")) : null,
        ],
      },
      {
        id: "admin",
        label: tr("group_admin", "Administration"),
        entries: [
          currentOrg?.role === "admin"
            ? { to: "/admin", icon: Shield, label: tr("admin", "Admin"), title: "Manage team & data" }
            : null,
          isOrgAdmin ? extra("/import", Upload, tr("import", "CSV Import")) : null,
          isOrgAdmin ? extra("/branding", Palette, tr("branding", "Branding")) : null,
          isOrgAdmin ? extra("/integrations", Plug, tr("integrations", "Integrations")) : null,
          isOrgAdmin ? extra("/pitch", Presentation, tr("pitch", "Sales One-Pager")) : null,
          manifest("settings"),
          { to: "/support", icon: LifeBuoy, label: tr("support", "Support") },
          isSuper
            ? {
                to: "/superadmin",
                icon: ShieldAlert,
                label: tr("superadmin", "Super Admin"),
                accent: "var(--accent-primary)",
              }
            : null,
        ],
      },
    ];

    return raw
      .map((s) => ({ ...s, entries: s.entries.filter(Boolean) as Entry[] }))
      .filter((s) => s.entries.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, category, currentOrg?.role, currentOrg?.product_profile, isSuper, role, profile, t]);

  const isActive = useCallback(
    (e: Entry) => (e.exact ? path === e.to : path === e.to || path.startsWith(e.to + "/")),
    [path],
  );

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const width = collapsed ? 64 : 232;

  return (
    <aside
      className="shrink-0 h-full border-r flex flex-col bg-panel transition-[width] duration-200"
      style={{ width, borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div
        className="px-3 py-4 border-b flex items-center gap-2 min-h-[60px] shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <SkytrackLogo size={collapsed ? 24 : 28} showWordmark={false} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div
              className="font-display font-bold text-base tracking-[0.16em] leading-none"
              style={{
                background: "linear-gradient(135deg, #3DD9FF 0%, #00C2A8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SKYTRACK
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-secondary-fg mt-1 truncate">
              {orgName}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto h-6 w-6 flex items-center justify-center text-secondary-fg hover:text-primary-fg transition-colors"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 py-2 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={section.id} className={si === 0 ? "" : "mt-3"}>
            {collapsed ? (
              si === 0 ? null : (
                <div className="mx-3 mb-2 border-t" style={{ borderColor: "var(--border-subtle)" }} />
              )
            ) : (
              <div className="px-4 mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.22em] text-secondary-fg/70">
                {section.label}
              </div>
            )}
            {section.entries.map((e) => {
              const Icon = e.icon;
              const active = isActive(e);
              return (
                <Link
                  key={e.to}
                  to={e.to}
                  onClick={onNavigate}
                  title={collapsed ? `${e.label}${e.title ? ` — ${e.title}` : ""}` : e.title ?? e.label}
                  className="relative flex items-center gap-3 mx-2 px-2.5 py-2 font-display uppercase text-[11px] tracking-[0.1em] transition-all"
                  style={{
                    background: active ? "var(--bg-elevated)" : "transparent",
                    color: e.accent ?? (active ? "var(--text-primary)" : "var(--text-secondary)"),
                    borderRadius: 2,
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px]"
                      style={{ background: "var(--accent-primary)", boxShadow: "0 0 8px var(--accent-glow)" }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{e.label}</span>
                      {e.badge && (
                        <span
                          className={`font-mono text-[8px] tracking-[0.1em] px-1.5 py-[1px] border rounded-sm ${BADGE_STYLES[e.badge]}`}
                        >
                          {e.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Product profile chip */}
      {!collapsed && (
        <div className="mx-2 mb-2 px-2.5 py-2 border shrink-0" style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}>
          <div className="font-display text-[10px] uppercase tracking-[0.14em]" style={{ color: profile.accent }}>
            SkyTrack · {profile.brand}
          </div>
          <div className="font-mono text-[9px] text-secondary-fg mt-1 truncate">{profile.headline}</div>
        </div>
      )}

      {/* Active category brand badge */}
      {category && !collapsed && (
        <div className="mx-2 mb-2 px-2.5 py-2 border shrink-0" style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}>
          <div className="font-display text-[10px] uppercase tracking-[0.14em]" style={{ color: CATEGORY_ACCENT[category] }}>
            {CATEGORY_LABEL[category]}
          </div>
        </div>
      )}

      {/* Tier badge */}
      <div
        className="mx-2 mb-2 px-2.5 py-2 flex items-center gap-2 border shrink-0"
        style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full pulse-dot shrink-0"
          style={{ background: tierMeta.color, color: tierMeta.color }}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0 leading-tight">
            <div
              className="font-display text-[10px] uppercase tracking-[0.14em] truncate"
              style={{ color: tierMeta.color }}
            >
              {tierMeta.label}
            </div>
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-secondary-fg truncate">
              {tierMeta.sublabel}
            </div>
          </div>
        )}
      </div>

      {/* User row */}
      <div
        className="border-t px-2 py-2 flex items-center gap-2 shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="w-7 h-7 shrink-0 flex items-center justify-center font-display text-[10px] font-bold tracking-wider"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--accent-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 2,
          }}
        >
          {initials(displayName)}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 leading-tight">
            <div className="font-display text-[11px] text-primary-fg truncate">{displayName}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-secondary-fg truncate">
              {role}
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          title="Sign out"
          className="h-7 w-7 flex items-center justify-center text-secondary-fg hover:text-red-400 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
