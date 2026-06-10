import { useEffect, useState } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAlertStore } from "@/stores/alertStore";
import { CommandInput } from "@/components/ui/CommandInput";

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
