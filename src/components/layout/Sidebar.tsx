import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  AlertTriangle,
  Map,
  Package,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Command", icon: LayoutDashboard, exact: true },
  { to: "/fleet", label: "Fleet", icon: Plane },
  { to: "/mro", label: "MRO", icon: Wrench },
  { to: "/crew", label: "Crew", icon: Users },
  { to: "/disruption", label: "Disruption", icon: AlertTriangle },
  { to: "/routing", label: "Routing", icon: Map },
  { to: "/cargo", label: "Cargo", icon: Package },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="w-[220px] shrink-0 border-r flex flex-col bg-panel"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="px-4 py-5 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
        <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--status-green)", color: "var(--status-green)" }} />
        <span className="font-display font-bold text-lg tracking-wider text-accent">SKY//TRACK</span>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 font-display uppercase text-xs tracking-[0.08em] transition-all"
              style={{
                borderLeft: active ? "2px solid var(--accent-primary)" : "2px solid transparent",
                background: active ? "var(--bg-elevated)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/login"))}
        className="m-2 btn-cmd-ghost justify-center"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </aside>
  );
}
