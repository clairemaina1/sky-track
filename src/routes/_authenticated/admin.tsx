import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { Users, Mail, Trash2, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Role = "admin" | "dispatcher" | "maintenance" | "pilot";

function AdminPage() {
  const org = useCurrentOrg();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("dispatcher");

  const orgId = org?.org_id;
  const isAdmin = org?.role === "admin";

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role, org_id")
        .eq("org_id", orgId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["org-invites", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("org_id", orgId!)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("invitations").insert({
        org_id: orgId!,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        invited_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["org-invites", orgId] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("org_id", orgId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members", orgId] }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("org_id", orgId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members", orgId] }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-invites", orgId] }),
  });

  if (!org) {
    return <div className="p-8 text-sm text-secondary-fg">Loading organization…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl">
        <div className="flex items-center gap-2 font-display text-sm">
          <Shield className="w-4 h-4 text-amber-400" /> Admins only
        </div>
        <p className="text-xs text-secondary-fg mt-2">
          You need the <code>admin</code> role in <strong>{org.name}</strong> to manage members.
          Ask an existing admin to promote you.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="font-display text-xs uppercase tracking-[0.16em] text-secondary-fg">
          {org.name} · Admin
        </div>
        <h1 className="font-display text-xl tracking-wide mt-1 flex items-center gap-2">
          <Users className="w-4 h-4" /> Team members
        </h1>
      </div>

      {/* Members list */}
      <section
        className="border bg-panel"
        style={{ borderColor: "var(--border-subtle)", borderRadius: 4 }}
      >
        {isLoading ? (
          <div className="p-4 text-xs text-secondary-fg">Loading…</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">{m.user_id}</div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => updateRole.mutate({ userId: m.user_id, role: e.target.value as Role })}
                  className="bg-transparent border rounded px-2 py-1 text-[11px] font-mono"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <option className="bg-slate-900" value="admin">admin</option>
                  <option className="bg-slate-900" value="dispatcher">dispatcher</option>
                  <option className="bg-slate-900" value="maintenance">maintenance</option>
                  <option className="bg-slate-900" value="pilot">pilot</option>
                </select>
                <button
                  onClick={() => {
                    if (confirm("Remove this member?")) removeMember.mutate(m.user_id);
                  }}
                  className="text-secondary-fg hover:text-red-400"
                  title="Remove member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite form */}
      <section>
        <h2 className="font-display text-sm uppercase tracking-[0.12em] flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4" /> Invite teammate
        </h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 bg-transparent border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
            style={{ borderColor: "var(--border-subtle)" }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="bg-transparent border rounded px-2 py-2 text-[11px] font-mono"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <option className="bg-slate-900" value="admin">admin</option>
            <option className="bg-slate-900" value="dispatcher">dispatcher</option>
            <option className="bg-slate-900" value="maintenance">maintenance</option>
            <option className="bg-slate-900" value="pilot">pilot</option>
          </select>
          <button
            disabled={!email.includes("@") || invite.isPending}
            onClick={() => invite.mutate()}
            className="px-4 py-2 font-display text-xs uppercase tracking-[0.12em] disabled:opacity-40"
            style={{ background: "var(--accent-primary)", color: "white", borderRadius: 2 }}
          >
            {invite.isPending ? "Inviting…" : "Send invite"}
          </button>
        </div>
        {invite.error && (
          <div className="text-xs text-red-400 mt-2">{(invite.error as Error).message}</div>
        )}

        {invites.length > 0 && (
          <ul
            className="mt-4 border divide-y bg-panel"
            style={{ borderColor: "var(--border-subtle)", borderRadius: 4 }}
          >
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className="flex-1 truncate">{inv.email}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary-fg">
                  {inv.role}
                </span>
                <span className="font-mono text-[10px] text-secondary-fg">pending</span>
                <button
                  onClick={() => revokeInvite.mutate(inv.id)}
                  className="text-secondary-fg hover:text-red-400"
                  title="Revoke invite"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Danger zone — clean slate */}
      <section>
        <h2 className="font-display text-sm uppercase tracking-[0.12em] text-red-400 mb-3">
          Reset organization data
        </h2>
        <p className="text-xs text-secondary-fg mb-3">
          Permanently delete all aircraft, crew, flights, maintenance records, cargo, and
          alerts for <strong>{org.name}</strong>. Members and the organization itself are
          kept so your team can start fresh.
        </p>
        <ResetDataButton orgId={org.org_id} orgName={org.name} />
      </section>
    </div>
  );
}

function ResetDataButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function reset() {
    const phrase = `RESET ${orgName}`;
    const input = prompt(`Type "${phrase}" to permanently wipe this org's data:`);
    if (input !== phrase) return;
    setBusy(true);
    const tables = ["alerts", "cargo", "flights", "maintenance", "crew", "aircraft"];
    for (const t of tables) {
      await supabase.from(t).delete().eq("org_id", orgId);
    }
    setBusy(false);
    setDone(true);
    qc.invalidateQueries();
  }

  return (
    <>
      <button
        onClick={reset}
        disabled={busy}
        className="px-4 py-2 font-display text-xs uppercase tracking-[0.12em] border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
        style={{ borderRadius: 2 }}
      >
        {busy ? "Wiping…" : "Wipe all org data"}
      </button>
      {done && (
        <div className="text-xs text-emerald-400 mt-2">Cleared. Org is now a clean slate.</div>
      )}
    </>
  );
}
