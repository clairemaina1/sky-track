import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  Map,
  Package,
  Zap,
  Leaf,
  GraduationCap,
  CalendarDays,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SkytrackLogo } from "@/components/brand/SkytrackLogo";
import {
  getPermittedNavItems,
  getTierMeta,
  type NavItem,
  type PlatformTier,
  type UserRole,
} from "@/lib/tierGuard";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  Map,
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

// Tier is org-scoped in a multi-tenant world. For now, allow override via
// localStorage (`skytrack.tier`) and default to commercial_airline.
function resolveTier(): PlatformTier {
  if (typeof window === "undefined") return "commercial_airline";
  const v = window.localStorage.getItem("skytrack.tier");
  return v === "flight_school" ? "flight_school" : "commercial_airline";
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<UserRole>("crew");
  const [tier, setTier] = useState<PlatformTier>("commercial_airline");
  const [displayName, setDisplayName] = useState("Operator");
  const [orgName, setOrgName] = useState("SkyTrack");

  useEffect(() => {
    setTier(resolveTier());
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

  const isActive = useCallback(
    (item: NavItem) => (item.exact ? path === item.to : path.startsWith(item.to)),
    [path],
  );

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const width = collapsed ? 64 : 232;

  return (
    <aside
      className="shrink-0 border-r flex flex-col bg-panel transition-[width] duration-200"
      style={{ width, borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div
        className="px-3 py-4 border-b flex items-center gap-2 min-h-[60px]"
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
      <nav className="flex-1 py-2 overflow-y-auto">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = isActive(item);
          const showDivider = item.groupStart && i !== 0;

          return (
            <div key={item.id}>
              {showDivider && (
                <div
                  className="mx-3 my-2 border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                />
              )}
              <Link
                to={item.to}
                title={collapsed ? `${item.label} — ${item.description}` : item.description}
                className="relative flex items-center gap-3 mx-2 px-2.5 py-2 font-display uppercase text-[11px] tracking-[0.1em] transition-all group"
                style={{
                  background: active ? "var(--bg-elevated)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
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
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`font-mono text-[8px] tracking-[0.1em] px-1.5 py-[1px] border rounded-sm ${BADGE_STYLES[item.badge]}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Tier badge */}
      <div
        className="mx-2 mb-2 px-2.5 py-2 flex items-center gap-2 border"
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
        className="border-t px-2 py-2 flex items-center gap-2"
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
