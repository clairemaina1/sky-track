import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddCargoDialog } from "@/components/crud/AddDialogs";
import { EditableCell } from "@/components/ui/EditableCell";
import { SavedViewsMenu } from "@/components/ui/SavedViewsMenu";
import type { Cargo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cargo")({
  head: pageHead({
    title: "Cargo — SkyTrack AAOS",
    description: "Cargo manifests, weight and balance, dangerous goods checks, and load planning.",
    path: "/cargo",
  }),
  component: CargoPage,
});

const HANDLING_COLOR: Record<string, string> = {
  DANGEROUS_GOODS: "var(--status-red)",
  PERISHABLE: "var(--status-amber)",
  LIVE_ANIMAL: "var(--status-green)",
};

const CARGO_STATUS = ["Loaded", "In-Transit", "Delivered", "Delayed", "Held-Customs"] as const;

interface CargoViewState {
  q: string;
  status: string; // "" = all
}

function CargoPage() {
  const [orgId] = useCurrentOrgId();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<CargoViewState>({ q: "", status: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["cargo", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (await supabase.from("cargo").select("*").eq("org_id", orgId!).order("awb_number")).data as Cargo[],
  });

  const visible = useMemo(() => {
    const q = view.q.trim().toLowerCase();
    return items.filter((c) => {
      if (view.status && c.status !== view.status) return false;
      if (!q) return true;
      return (
        c.awb_number.toLowerCase().includes(q) ||
        c.shipper.toLowerCase().includes(q) ||
        c.consignee.toLowerCase().includes(q) ||
        c.origin_icao.toLowerCase().includes(q) ||
        c.destination_icao.toLowerCase().includes(q)
      );
    });
  }, [items, view]);

  const stats = {
    total: items.length,
    transit: items.filter((c) => c.status === "In-Transit").length,
    delayed: items.filter((c) => c.status === "Delayed").length,
    customs: items.filter((c) => c.status === "Held-Customs").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display uppercase tracking-[0.12em] text-lg">Cargo Operations</h1>
          <p className="text-[11px] text-slate-500">Double-click any cell to edit inline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            <input
              value={view.q}
              onChange={(e) => setView((v) => ({ ...v, q: e.target.value }))}
              placeholder="AWB, shipper, route…"
              className="rounded border bg-transparent py-1.5 pl-7 pr-2 text-[11px] text-slate-200 outline-none"
              style={{ borderColor: "rgba(255,255,255,0.08)", width: 220 }}
            />
          </div>
          <select
            value={view.status}
            onChange={(e) => setView((v) => ({ ...v, status: e.target.value }))}
            className="rounded border bg-transparent px-2 py-1.5 text-[11px] text-slate-200 outline-none"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <option value="">All statuses</option>
            {CARGO_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <SavedViewsMenu<CargoViewState>
            scope="cargo"
            current={view}
            onApply={setView}
            describe={(p) => `q="${p.q}" · status=${p.status || "all"}`}
          />
          <button onClick={() => setAddOpen(true)} className="btn-cmd shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Shipment
          </button>
        </div>
      </div>
      <AddCargoDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Total", stats.total],
          ["In-Transit", stats.transit],
          ["Delayed", stats.delayed],
          ["Held Customs", stats.customs],
        ].map(([l, v]) => (
          <div key={l as string} className="panel p-4">
            <div className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">{l}</div>
            <div className="font-display font-bold text-3xl mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              {["AWB #", "Route", "Shipper → Consignee", "Weight", "Commodity", "Handling", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const isDelayed = c.status === "Delayed";
              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: isDelayed ? "rgba(245,158,11,0.06)" : undefined,
                  }}
                >
                  <td className="px-3 py-1.5 font-mono text-accent">
                    <EditableCell table="cargo" rowId={c.id} field="awb_number" value={c.awb_number} />
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">
                    <div className="flex items-center gap-1">
                      <EditableCell table="cargo" rowId={c.id} field="origin_icao" value={c.origin_icao} className="w-16" />
                      <span className="text-slate-600">→</span>
                      <EditableCell table="cargo" rowId={c.id} field="destination_icao" value={c.destination_icao} className="w-16" />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <EditableCell table="cargo" rowId={c.id} field="shipper" value={c.shipper} />
                      <span className="text-slate-600">→</span>
                      <EditableCell table="cargo" rowId={c.id} field="consignee" value={c.consignee} />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">
                    <EditableCell
                      table="cargo"
                      rowId={c.id}
                      field="weight_kg"
                      value={Number(c.weight_kg)}
                      kind="number"
                      display={(v) => (v == null ? <span className="text-slate-600">—</span> : `${Number(v).toLocaleString()} kg`)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-xs text-secondary-fg">
                    <EditableCell table="cargo" rowId={c.id} field="commodity_type" value={c.commodity_type} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.special_handling.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[9px] px-1.5 py-0.5 border"
                          style={{ color: HANDLING_COLOR[t] ?? "var(--text-secondary)", borderColor: "currentColor" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <EditableCell
                      table="cargo"
                      rowId={c.id}
                      field="status"
                      value={c.status}
                      kind="select"
                      options={CARGO_STATUS}
                      display={(v) => <StatusBadge status={String(v)} />}
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-xs text-secondary-fg">
                  No shipments match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
