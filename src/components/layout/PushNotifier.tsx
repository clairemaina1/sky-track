import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";

type Priority = "critical" | "high" | "normal" | "low";
interface Notification {
  id: string;
  org_id: string;
  user_id: string | null;
  target_role: string | null;
  priority: Priority;
  category: string;
  title: string;
  body: string | null;
  action_url: string | null;
  created_at: string;
}

const STYLE: Record<Priority, { border: string; bg: string; icon: string; label: string }> = {
  critical: { border: "var(--status-red)", bg: "color-mix(in oklab, var(--status-red) 14%, var(--bg-elevated))", icon: "🔴", label: "CRITICAL" },
  high:     { border: "var(--status-amber)", bg: "color-mix(in oklab, var(--status-amber) 12%, var(--bg-elevated))", icon: "🟠", label: "HIGH" },
  normal:   { border: "var(--accent-primary)", bg: "color-mix(in oklab, var(--accent-primary) 10%, var(--bg-elevated))", icon: "🔵", label: "INFO" },
  low:      { border: "var(--border-subtle)", bg: "var(--bg-elevated)", icon: "⚪", label: "LOW" },
};

/**
 * PushNotifier — subscribes to the notifications table for the current user + org
 * and surfaces color-coded toasts prioritized by severity.
 */
export function PushNotifier() {
  const [orgId] = useCurrentOrgId();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    // Prime seen-set with recent ids so we don't blast historical toasts on mount.
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      (data ?? []).forEach((r: { id: string }) => seen.current.add(r.id));
    })();

    const show = (n: Notification) => {
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      const s = STYLE[n.priority] ?? STYLE.normal;
      toast.custom(
        (t) => (
          <div
            role="alert"
            style={{
              borderLeft: `4px solid ${s.border}`,
              background: s.bg,
              color: "var(--text-primary)",
              padding: "12px 14px",
              borderRadius: 8,
              minWidth: 320,
              maxWidth: 420,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              cursor: n.action_url ? "pointer" : "default",
              fontFamily: "inherit",
            }}
            onClick={() => {
              if (n.action_url) {
                navigate({ to: n.action_url });
                toast.dismiss(t);
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: "var(--font-mono, ui-monospace)", letterSpacing: "0.14em", textTransform: "uppercase", color: s.border, marginBottom: 4 }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <span style={{ opacity: 0.6 }}>· {n.category}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{n.body}</div>}
          </div>
        ),
        {
          duration: n.priority === "critical" ? Infinity : n.priority === "high" ? 15000 : 6000,
        }
      );
    };

    const channel = supabase
      .channel(`notifications:${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `org_id=eq.${orgId}` },
        (payload) => show(payload.new as Notification)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orgId, navigate]);

  return null;
}
