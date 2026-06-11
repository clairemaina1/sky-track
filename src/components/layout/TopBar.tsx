import { useEffect, useState } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import { Bell, Building2 } from "lucide-react";
import { useAlertStore } from "@/stores/alertStore";
import { CommandInput } from "@/components/ui/CommandInput";
import { useMyOrgs, useCurrentOrgId } from "@/hooks/use-org";

function OrgSwitcher() {
  const { data: orgs = [] } = useMyOrgs();
  const [orgId, setOrgId] = useCurrentOrgId();
  if (orgs.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="w-3.5 h-3.5 text-secondary-fg" />
      <select
        value={orgId ?? ""}
        onChange={(e) => setOrgId(e.target.value)}
        className="bg-transparent border rounded px-2 py-1 text-[11px] font-mono text-secondary-fg focus:outline-none focus:border-emerald-500/40"
        style={{ borderColor: "var(--border-subtle)" }}
        aria-label="Switch organization"
      >
        {orgs.map((o) => (
          <option key={o.org_id} value={o.org_id} className="bg-slate-900">
            {o.name} · {o.tier === "flight_school" ? "Flight School" : "Commercial"}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const unread = useAlertStore((s) => s.unreadCount);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const utc = now.toISOString().slice(11, 19) + " UTC";
  return (
    <header
      className="h-12 flex items-center justify-between px-4 border-b bg-panel"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg">
        {path === "/" ? "Command Center" : path.replace("/", "").toUpperCase()}
      </div>
      <div className="flex items-center gap-4">
        <OrgSwitcher />
        <CommandInput />
        <span className="font-mono text-xs text-secondary-fg">{utc}</span>
        <Link to={"/disruption" as string} className="relative">
          <Bell className="w-4 h-4 text-secondary-fg" />
          {unread > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-semibold flex items-center justify-center"
              style={{ background: "var(--status-red)", color: "white" }}
            >
              {unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
