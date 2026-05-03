import { useEffect, useState } from "react";
import { useAlertStore } from "@/stores/alertStore";

export function StatusStrip() {
  const unread = useAlertStore((s) => s.unreadCount);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="h-6 px-4 flex items-center gap-6 border-t font-mono text-[10px] uppercase tracking-wider text-muted-fg"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-panel)" }}
    >
      <span>SKYTRACK AAOS v1.0</span>
      <span>UTC {now.toISOString().slice(11, 19)}</span>
      <span style={{ color: unread > 0 ? "var(--status-amber)" : "var(--status-green)" }}>
        ● {unread} ACTIVE ALERTS
      </span>
      <span style={{ color: "var(--status-green)" }}>● CLOUD CONNECTED</span>
    </div>
  );
}
