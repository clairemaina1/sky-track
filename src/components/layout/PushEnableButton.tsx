import { useState, useEffect } from "react";
import { BellRing, Check, X } from "lucide-react";
import { usePush } from "@/hooks/use-push";
import { toast } from "sonner";

export function PushEnableButton() {
  const { status, enable, sendTest } = usePush();
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (status === "unsupported") return null;

  const label =
    status === "granted" ? "Push enabled" : status === "denied" ? "Push blocked" : "Enable push";

  return (
    <div className="px-3 py-2 flex items-center justify-between gap-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-2 text-[11px] text-secondary-fg">
        <BellRing className="w-3.5 h-3.5" />
        <span className="font-mono">{label}</span>
      </div>
      {status === "granted" ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { const r = await sendTest(); toast.success(`Push fired to ${r.sent} device(s)`); }
            catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}
          className="text-[10px] font-display uppercase tracking-[0.14em] text-accent hover:underline flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Test
        </button>
      ) : status === "denied" ? (
        <span className="text-[10px] text-secondary-fg flex items-center gap-1"><X className="w-3 h-3" /> Allow in browser</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { const r = await enable(); if (r?.ok) toast.success("Push enabled on this device"); else toast.error(`Denied (${r?.reason ?? "unknown"})`); }
            catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}
          className="text-[10px] font-display uppercase tracking-[0.14em] text-accent hover:underline"
        >
          Turn on
        </button>
      )}
    </div>
  );
}
