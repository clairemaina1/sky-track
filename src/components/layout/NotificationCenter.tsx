import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useAlertStore } from "@/stores/alertStore";
import type { Alert } from "@/lib/types";
import { PushEnableButton } from "@/components/layout/PushEnableButton";

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const SEV_DOT: Record<Alert["severity"], string> = {
  critical: "var(--status-red)",
  warning: "var(--status-amber)",
  info: "var(--status-green)",
};

export function NotificationCenter() {
  const alerts = useAlertStore((s) => s.alerts);
  const unread = useAlertStore((s) => s.unreadCount);
  const acknowledge = useAlertStore((s) => s.acknowledge);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const recent = alerts.slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${mounted && unread > 0 ? ` · ${unread} unread` : ""}`}
        className="relative h-8 w-8 flex items-center justify-center text-secondary-fg hover:text-primary-fg transition-colors rounded-md hover:bg-elevated"
      >
        <Bell className="w-4 h-4" />
        {mounted && unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-mono font-semibold flex items-center justify-center ring-2 ring-panel"
            style={{ background: "var(--status-red)", color: "white" }}
            suppressHydrationWarning
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[92vw] panel overflow-hidden z-50"
          style={{
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)",
            borderRadius: 12,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="font-display uppercase text-[11px] tracking-[0.14em] text-primary-fg">
              Alerts
            </div>
            <span className="font-mono text-[10px] text-secondary-fg">
              {mounted ? `${unread} unread · ${alerts.length} total` : "—"}
            </span>
          </div>

          <PushEnableButton />

          <div className="max-h-[60vh] overflow-y-auto divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {recent.length === 0 && (
              <div className="px-6 py-10 text-center text-xs text-secondary-fg">
                <Bell className="w-5 h-5 mx-auto mb-2 opacity-40" />
                No alerts. All systems nominal.
              </div>
            )}
            {recent.map((a) => (
              <div
                key={a.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-elevated/40 transition-colors group"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: SEV_DOT[a.severity], opacity: a.acknowledged ? 0.35 : 1 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={`text-[12px] truncate ${a.acknowledged ? "text-secondary-fg" : "text-primary-fg font-medium"}`}>
                      {a.title}
                    </div>
                    <span className="font-mono text-[9px] text-secondary-fg shrink-0">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  {a.body && (
                    <div className="text-[11px] text-secondary-fg mt-0.5 line-clamp-2">{a.body}</div>
                  )}
                </div>
                {!a.acknowledged && (
                  <button
                    type="button"
                    onClick={() => acknowledge(a.id)}
                    aria-label="Mark as read"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded text-secondary-fg hover:text-emerald-400 hover:bg-elevated"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Link
            to={"/disruption" as string}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-[11px] font-display uppercase tracking-[0.14em] text-accent hover:bg-elevated/60 border-t transition-colors"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            Open disruption console →
          </Link>
        </div>
      )}
    </div>
  );
}
