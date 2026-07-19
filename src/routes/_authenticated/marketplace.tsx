import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { useState } from "react";
import { Plane, Handshake, Users, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: pageHead({
    title: "Wet-Lease & Charter Marketplace — SkyTrack",
    description: "Cross-operator marketplace for wet-lease, dry-lease, ad-hoc charter and contract crew.",
    path: "/marketplace",
  }),
  component: MarketplacePage,
});

type Listing = {
  id: string; org_id: string; kind: "wet_lease" | "dry_lease" | "charter" | "crew";
  title: string; aircraft_type: string | null; tail: string | null; base_iata: string | null;
  available_from: string | null; available_to: string | null; hourly_rate_usd: number | null;
  notes: string | null; contact_email: string | null; status: string; created_at: string;
};

const KIND_META: Record<Listing["kind"], { label: string; color: string; Icon: typeof Plane }> = {
  wet_lease: { label: "Wet Lease", color: "#3DD9FF", Icon: Plane },
  dry_lease: { label: "Dry Lease", color: "#8B5CF6", Icon: Plane },
  charter: { label: "Charter", color: "#00C2A8", Icon: Handshake },
  crew: { label: "Crew", color: "#F5B301", Icon: Users },
};

function MarketplacePage() {
  const org = useCurrentOrg();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | Listing["kind"]>("all");
  const [showForm, setShowForm] = useState(false);

  const { data: listings = [] } = useQuery({
    queryKey: ["marketplace"],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_listings").select("*").eq("status", "open").order("created_at", { ascending: false });
      return (data ?? []) as Listing[];
    },
  });

  const filtered = filter === "all" ? listings : listings.filter((l) => l.kind === filter);

  const create = useMutation({
    mutationFn: async (payload: Partial<Listing>) => {
      if (!org?.id) throw new Error("Select an organization first");
      const { error } = await supabase.from("marketplace_listings").insert({ ...payload, org_id: org.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketplace"] }); setShowForm(false); toast.success("Listing posted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.14em]">Marketplace</h1>
          <p className="text-sm text-secondary-fg mt-1">Cross-operator wet-lease, charter and contract crew.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-2 border font-display text-xs uppercase tracking-wider flex items-center gap-2"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Post listing
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "wet_lease", "dry_lease", "charter", "crew"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="px-3 py-1.5 border font-display text-[10px] uppercase tracking-wider"
            style={{
              borderColor: filter === k ? "var(--accent-primary)" : "var(--border-subtle)",
              color: filter === k ? "var(--accent-primary)" : "var(--text-secondary)",
              background: filter === k ? "var(--bg-elevated)" : "transparent",
            }}
          >
            {k === "all" ? "All" : KIND_META[k].label}
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              kind: f.get("kind") as Listing["kind"],
              title: String(f.get("title") ?? ""),
              aircraft_type: (f.get("aircraft_type") as string) || null,
              tail: (f.get("tail") as string) || null,
              base_iata: (f.get("base_iata") as string) || null,
              hourly_rate_usd: f.get("rate") ? Number(f.get("rate")) : null,
              notes: (f.get("notes") as string) || null,
              contact_email: (f.get("contact_email") as string) || null,
            });
          }}
          className="mb-6 p-4 border grid grid-cols-2 gap-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
        >
          <select name="kind" defaultValue="wet_lease" className="bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
            <option value="wet_lease">Wet Lease</option>
            <option value="dry_lease">Dry Lease</option>
            <option value="charter">Charter</option>
            <option value="crew">Crew</option>
          </select>
          <input name="title" placeholder="Title *" required className="bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <input name="aircraft_type" placeholder="Type (e.g. B737-800)" className="bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <input name="tail" placeholder="Tail" className="bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <input name="base_iata" placeholder="Base IATA" maxLength={3} className="bg-app border px-2 py-1.5 text-sm uppercase" style={{ borderColor: "var(--border-subtle)" }} />
          <input name="rate" type="number" step="1" placeholder="Rate USD/hr" className="bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <input name="contact_email" type="email" placeholder="Contact email" className="col-span-2 bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <textarea name="notes" placeholder="Notes" rows={2} className="col-span-2 bg-app border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border-subtle)" }} />
          <button type="submit" disabled={create.isPending} className="col-span-2 py-2 bg-accent-primary text-white font-display text-xs uppercase tracking-wider">
            {create.isPending ? "Posting…" : "Post to marketplace"}
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-secondary-fg border" style={{ borderColor: "var(--border-subtle)" }}>
            No open listings in this category.
          </div>
        )}
        {filtered.map((l) => {
          const meta = KIND_META[l.kind];
          const Icon = meta.Icon;
          return (
            <div key={l.id} className="p-4 border grid grid-cols-[auto_1fr_auto] gap-4 items-start" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
              <div className="w-10 h-10 flex items-center justify-center border" style={{ borderColor: meta.color, color: meta.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display uppercase text-[10px] tracking-wider px-1.5 py-0.5 border" style={{ borderColor: meta.color, color: meta.color }}>
                    {meta.label}
                  </span>
                  {l.aircraft_type && <span className="font-mono text-[10px] text-secondary-fg">{l.aircraft_type}</span>}
                  {l.tail && <span className="font-mono text-[10px] text-secondary-fg">· {l.tail}</span>}
                </div>
                <div className="font-display text-base">{l.title}</div>
                {l.notes && <div className="text-xs text-secondary-fg mt-1">{l.notes}</div>}
                <div className="flex gap-4 mt-2 text-[11px] text-secondary-fg font-mono">
                  {l.base_iata && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.base_iata}</span>}
                  {l.available_from && <span>Avail {l.available_from}{l.available_to ? ` → ${l.available_to}` : ""}</span>}
                </div>
              </div>
              <div className="text-right">
                {l.hourly_rate_usd && (
                  <div className="font-display text-lg" style={{ color: meta.color }}>
                    ${Number(l.hourly_rate_usd).toLocaleString()}
                    <span className="font-mono text-[10px] text-secondary-fg ml-1">/hr</span>
                  </div>
                )}
                {l.contact_email && (
                  <a href={`mailto:${l.contact_email}`} className="text-xs text-accent-fg underline mt-1 block">
                    Contact
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
