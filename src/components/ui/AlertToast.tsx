import { useEffect } from "react";
import { useAlertStore } from "@/stores/alertStore";
import { AlertTriangle, X } from "lucide-react";

export function AlertToast() {
  const queue = useAlertStore((s) => s.toastQueue);
  const pop = useAlertStore((s) => s.popToast);
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(pop, 6000);
    return () => clearTimeout(id);
  }, [current, pop]);

  if (!current) return null;
  const isCritical = current.severity === "Critical";
  const color = isCritical ? "var(--status-red)" : "var(--status-amber)";
  return (
    <div
      className="fixed top-16 right-4 z-50 panel max-w-md p-3 flex items-start gap-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="font-display uppercase text-xs tracking-wider font-semibold" style={{ color }}>
          {current.severity} · {current.type}
        </div>
        <div className="font-display font-semibold text-sm mt-0.5">{current.title}</div>
        <div className="text-xs text-secondary-fg mt-1">{current.body}</div>
      </div>
      <button onClick={pop} className="text-muted-fg hover:text-primary-fg">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
