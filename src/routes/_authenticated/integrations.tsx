import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { Radio, Wrench, Globe, Wifi, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/_authenticated/integrations")({
  component: IntegrationsPage,
  head: () => pageHead({
    title: "Ecosystem Integrations — SkyTrack",
    description: "Plug into ACARS/SITA, AMOS, and ICAO registries in under an hour — no 6-month database migrations.",
    path: "/integrations",
  }),
});

type Row = {
  id: string; org_id: string; provider: string; status: string;
  last_sync_at: string | null; last_error: string | null;
};

const CATALOG: { provider: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { provider: "ACARS", title: "ACARS / SITA Live Flight Tracking", description: "Real-time OOOI, position, and datalink messages routed straight into the Command Center.", icon: Radio },
  { provider: "AMOS", title: "AMOS Maintenance", description: "Two-way sync with AMOS for work orders, part status, and airworthiness data.", icon: Wrench },
  { provider: "ICAO", title: "ICAO Registries", description: "Regulatory compliance validation against ICAO aircraft, operator and route registries.", icon: Globe },
  { provider: "SITA", title: "SITA Type-B Messaging", description: "Standard airline messaging: MVT, LDM, PSM and passenger service messages.", icon: Wifi },
];

const STATUS_STYLE: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  connected: { color: "var(--status-green)", icon: CheckCircle2, label: "Connected" },
  pending: { color: "var(--accent-primary)", icon: Clock, label: "Pending" },
  error: { color: "var(--status-red)", icon: AlertCircle, label: "Error" },
  disconnected: { color: "var(--text-secondary)", icon: XCircle, label: "Disconnected" },
};

function IntegrationsPage() {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["integrations", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Row[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("integrations").select("*").eq("org_id", orgId!);
      return (data ?? []) as Row[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: { provider: string; status: string }) => {
      if (!orgId) throw new Error("No org");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("integrations").upsert({
        org_id: orgId,
        provider: payload.provider,
        status: payload.status,
        last_sync_at: payload.status === "connected" ? new Date().toISOString() : null,
        last_error: null,
      }, { onConflict: "org_id,provider" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  async function toggle(provider: string, currentStatus: string) {
    setBusyProvider(provider);
    const next = currentStatus === "connected" ? "disconnected" : "connected";
    await upsert.mutateAsync({ provider, status: next });
    setBusyProvider(null);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="font-display text-xl text-primary-fg">Ecosystem Integrations</h1>
        <p className="text-sm text-secondary-fg mt-1">
          Standard aviation pipelines — no six-month database migrations. Connect ACARS/SITA, AMOS, and ICAO registries and see a live dashboard within an hour.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATALOG.map((c) => {
          const row = q.data?.find((r) => r.provider === c.provider);
          const status = row?.status ?? "disconnected";
          const s = STATUS_STYLE[status] ?? STATUS_STYLE.disconnected;
          const Icon = c.icon;
          const StatusIcon = s.icon;
          const busy = busyProvider === c.provider;

          return (
            <div key={c.provider} className="panel p-4 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                >
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-primary-fg">{c.title}</div>
                  <div className="text-[11px] text-secondary-fg leading-relaxed mt-0.5">{c.description}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider" style={{ color: s.color }}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {s.label}
                  {row?.last_sync_at && (
                    <span className="text-secondary-fg ml-2 normal-case tracking-normal">
                      · synced {new Date(row.last_sync_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggle(c.provider, status)}
                  disabled={busy}
                  className="btn-cmd text-[10px]"
                >
                  {busy ? "…" : status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-secondary-fg mt-2">
        Connection scaffolding is enabled for all tiers. Full data-plane wiring for each provider is provisioned by your SkyTrack solutions team.
      </p>
    </div>
  );
}
