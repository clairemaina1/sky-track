import { useEffect, useState } from "react";
import { useAlertStore } from "@/stores/alertStore";

export function StatusStrip() {
  const unread = useAlertStore((s) => s.unreadCount);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace("_", " ") ?? "LOCAL" : "LOCAL";
  const local = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--";
  const utc = now ? now.toISOString().slice(11, 19) : "--:--:--";
  return (
    <div
      className="h-6 px-4 flex items-center gap-6 border-t font-mono text-[10px] uppercase tracking-wider text-muted-fg"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-panel)" }}
    >
      <span>SKYTRACK AAOS v1.0</span>
      <span>{tz} {local}</span>
      <span className="opacity-60">UTC {utc}</span>
      <span style={{ color: unread > 0 ? "var(--status-amber)" : "var(--status-green)" }}>
        ● {unread} ACTIVE ALERTS
      </span>
      <span style={{ color: "var(--status-green)" }}>● CLOUD CONNECTED</span>
    </div>
  );
}

