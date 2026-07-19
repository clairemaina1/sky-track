import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/use-category";
import { Shield, CheckCircle2, XCircle, Building2, Users2, Plane, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { resetDemoOrg } from "@/lib/demo-reset.functions";

export const Route = createFileRoute("/_authenticated/superadmin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const isSuper = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
    if (!isSuper) throw redirect({ to: "/" });
  },
  component: SuperAdminPage,
});

const CATS: { value: "flight_school" | "icao" | "airline" | "cargo"; label: string }[] = [
  { value: "flight_school", label: "Flight Schools" },
  { value: "icao", label: "ICAO" },
  { value: "airline", label: "Airlines" },
  { value: "cargo", label: "Cargo" },
];

function SuperAdminPage() {
  const { data: isSuper } = useSuperAdmin();
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["super-pending"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("pending_users")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["super-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").order("name");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["super-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("org_id, user_id, role, organizations(name)");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: stats } = useQuery({
    queryKey: ["super-stats"],
    queryFn: async () => {
      const [a, f, c] = await Promise.all([
        supabase.from("aircraft").select("id", { count: "exact", head: true }),
        supabase.from("flights").select("id", { count: "exact", head: true }),
        supabase.from("crew").select("id", { count: "exact", head: true }),
      ]);
      return { aircraft: a.count ?? 0, flights: f.count ?? 0, crew: c.count ?? 0 };
    },
    enabled: !!isSuper,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
        <div>
          <h1 className="font-display text-xl uppercase tracking-[0.18em]">Super Admin</h1>
          <p className="text-xs text-secondary-fg font-mono uppercase tracking-[0.14em]">All clients · all categories</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Organizations" value={orgs.length} icon={<Building2 className="w-4 h-4" />} />
        <Stat label="Users" value={new Set(members.map((m: { user_id: string }) => m.user_id)).size} icon={<Users2 className="w-4 h-4" />} />
        <Stat label="Aircraft" value={stats?.aircraft ?? 0} icon={<Plane className="w-4 h-4" />} />
        <Stat label="Pending" value={pending.length} icon={<Shield className="w-4 h-4" />} />
      </div>

      <section>
        <h2 className="font-display text-sm uppercase tracking-[0.14em] mb-3">Pending sign-ups</h2>
        {!pending.length && <p className="text-xs text-secondary-fg">No pending users.</p>}
        <div className="space-y-2">
          {pending.map((p: { id: string; email: string; full_name: string | null; created_at: string }) => (
            <PendingRow key={p.id} pending={p} orgs={orgs} onDone={() => qc.invalidateQueries({ queryKey: ["super-pending"] })} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm uppercase tracking-[0.14em] mb-3">Organizations</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {orgs.map((o: { id: string; name: string; tier: string }) => {
            const count = members.filter((m: { org_id: string }) => m.org_id === o.id).length;
            const isDemo = /demo/i.test(o.name);
            return (
              <div key={o.id} className="p-3 border" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm">{o.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-secondary-fg">{o.tier} · {count} members</div>
                  </div>
                  {isDemo && <DemoResetButton orgId={o.id} orgName={o.name} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DemoResetButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const reset = useServerFn(resetDemoOrg);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Wipe ALL operational data from "${orgName}"?\nThis deletes aircraft, flights, crew, cargo, MRO, alerts, and notifications.\nThe organization and its members are preserved.`)) return;
        setBusy(true);
        try {
          const r = await reset({ data: { orgId } });
          const total = Object.values(r.deleted).reduce((s, n) => s + (n as number), 0);
          toast.success(`Clean slate — deleted ${total} rows across ${Object.keys(r.deleted).length} tables`);
          qc.invalidateQueries();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display uppercase tracking-[0.14em] border text-red-400 border-red-400/40 hover:bg-red-500/10"
      title="Wipe operational data for a fresh customer demo"
    >
      <Trash2 className="w-3 h-3" /> {busy ? "Wiping…" : "Reset demo"}
    </button>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-3 border" style={{ borderColor: "var(--border-subtle)", borderRadius: 3, background: "var(--bg-panel)" }}>
      <div className="flex items-center gap-2 text-secondary-fg text-[10px] font-mono uppercase tracking-[0.14em]">
        {icon} {label}
      </div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}

function PendingRow({
  pending,
  orgs,
  onDone,
}: {
  pending: { id: string; email: string; full_name: string | null };
  orgs: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [role, setRole] = useState<"crew" | "maintenance" | "dispatcher" | "admin">("crew");
  const [cats, setCats] = useState<Set<string>>(new Set(["airline"]));

  const approve = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Pick an org");
      if (!cats.size) throw new Error("Pick at least one category");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("approve_pending_user", {
        _pending_id: pending.id,
        _org_id: orgId,
        _role: role,
        _categories: Array.from(cats),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User approved"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pending_users")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", pending.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rejected"); onDone(); },
  });

  return (
    <div className="p-3 border space-y-2" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-sm">{pending.full_name ?? pending.email}</div>
          <div className="text-[10px] font-mono text-secondary-fg">{pending.email}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="bg-transparent border px-2 py-1" style={{ borderColor: "var(--border-subtle)" }}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as "crew" | "maintenance" | "dispatcher" | "admin")} className="bg-transparent border px-2 py-1" style={{ borderColor: "var(--border-subtle)" }}>
          <option value="crew">Crew</option>
          <option value="maintenance">Maintenance</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="admin">Org Admin</option>
        </select>
        {CATS.map((c) => (
          <label key={c.value} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={cats.has(c.value)}
              onChange={(e) => {
                const next = new Set(cats);
                if (e.target.checked) next.add(c.value); else next.delete(c.value);
                setCats(next);
              }}
            />
            {c.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => approve.mutate()}
          disabled={approve.isPending}
          className="flex items-center gap-1 px-3 py-1 text-xs font-display uppercase tracking-[0.14em] border"
          style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
        </button>
        <button
          onClick={() => reject.mutate()}
          className="flex items-center gap-1 px-3 py-1 text-xs font-display uppercase tracking-[0.14em] border text-red-400 border-red-400/40"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}
