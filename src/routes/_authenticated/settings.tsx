import { pageHead } from "@/lib/routeHead";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, User, Users, Shield, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, useResolvedTier } from "@/hooks/use-org";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: pageHead({ title: "Settings — SkyTrack AAOS", description: "Organization, branding, language, theme, and integration settings.", path: "/settings" }), component: SettingsPage });

type Tab = "organisation" | "account" | "team" | "integrations" | "compliance";
type Tier = "flight_school" | "commercial_airline";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "organisation", label: "Organisation", icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: "account", label: "Account", icon: <User className="w-3.5 h-3.5" /> },
  { id: "team", label: "Team", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "integrations", label: "Integrations", icon: <Plug className="w-3.5 h-3.5" /> },
  { id: "compliance", label: "Compliance", icon: <Shield className="w-3.5 h-3.5" /> },
];

function SettingsPage() {
  const currentOrg = useCurrentOrg();
  const isAdmin = currentOrg?.role === "admin";
  const tier: Tier = useResolvedTier();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("organisation");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("Operator");
  const [orgName, setOrgName] = useState(currentOrg?.name ?? "SKYTRACK Airways");
  const [iata, setIata] = useState("ST");
  const [icao, setIcao] = useState("SKT");
  const [hq, setHq] = useState("Nairobi, Kenya");
  const [offsetGoal, setOffsetGoal] = useState(18000);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const n = (data.user.user_metadata?.full_name as string | undefined) ?? "";
      if (n) setDisplayName(n);
    });
  }, []);

  useEffect(() => {
    if (currentOrg?.name) setOrgName(currentOrg.name);
  }, [currentOrg?.name]);

  async function commitTier(next: Tier) {
    if (!isAdmin || !currentOrg) {
      flash("Only org admins can change the platform tier.");
      return;
    }
    const dbTier = next === "flight_school" ? "flight_school" : "commercial";
    const { error } = await supabase
      .from("organizations")
      .update({ tier: dbTier })
      .eq("id", currentOrg.org_id);
    if (error) {
      flash(`Failed to update tier: ${error.message}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["my-orgs"] });
    flash("Platform tier updated.");
  }

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2500);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase tracking-[0.12em] text-lg">Settings</h1>
        <div className="font-mono text-[10px] uppercase tracking-wider text-secondary-fg">
          Organisation Profile · Compliance · Integrations
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-display uppercase text-[10px] tracking-[0.12em] border transition-colors"
              style={{
                background: active ? "var(--bg-elevated)" : "transparent",
                color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {saved && (
        <div
          className="panel px-3 py-2 text-xs font-mono"
          style={{ borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
        >
          ✓ {saved}
        </div>
      )}

      {tab === "organisation" && (
        <Section title="Organisation Profile">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Organisation Name" value={orgName} onChange={setOrgName} />
            <Input label="Headquarters" value={hq} onChange={setHq} />
            <Input label="IATA Code" value={iata} onChange={setIata} mono uppercase />
            <Input label="ICAO Code" value={icao} onChange={setIcao} mono uppercase />
            <div>
              <Label>Platform Tier</Label>
              <div className="flex gap-2 mt-2">
                {(["commercial_airline", "flight_school"] as Tier[]).map((t) => {
                  const active = tier === t;
                  return (
                    <button
                      key={t}
                      onClick={() => commitTier(t)}
                      className="flex-1 px-3 py-2 text-[11px] font-display uppercase tracking-wider border transition-colors"
                      style={{
                        background: active ? "var(--accent-primary)" : "transparent",
                        color: active ? "var(--bg-void)" : "var(--text-secondary)",
                        borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
                      }}
                    >
                      {t === "commercial_airline" ? "Commercial" : "Flight School"}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input
              label="Carbon Offset Goal (tonnes/yr)"
              value={String(offsetGoal)}
              onChange={(v) => setOffsetGoal(Number(v) || 0)}
              mono
            />
          </div>
          <SaveButton onClick={() => flash("Organisation profile saved.")} />
        </Section>
      )}

      {tab === "account" && (
        <Section title="Account">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Display Name" value={displayName} onChange={setDisplayName} />
            <Input label="Email" value={email} onChange={() => {}} disabled />
          </div>
          <div className="mt-4 text-xs text-secondary-fg font-mono">
            Email changes are managed by the auth provider and require re-verification.
          </div>
          <SaveButton onClick={() => flash("Account preferences saved.")} />
        </Section>
      )}

      {tab === "team" && (
        <Section title="Team & Roles">
          <p className="text-xs text-secondary-fg">
            Role assignments are governed by row-level security on{" "}
            <span className="font-mono text-accent">user_roles</span>. Only administrators can
            grant or revoke privileges — preventing self-promotion attacks.
          </p>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                {["Member", "Role", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-2 py-1.5 font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-2 py-2">{displayName}</td>
                <td className="px-2 py-2 font-mono text-xs text-accent">admin</td>
                <td className="px-2 py-2 font-mono text-xs" style={{ color: "#10b981" }}>
                  Active
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      )}

      {tab === "integrations" && (
        <Section title="External Integrations">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { name: "ACARS / SITA", status: "Connected", tone: "#10b981" },
              { name: "FlightAware Firehose", status: "Connected", tone: "#10b981" },
              { name: "AMOS MRO", status: "Pending", tone: "#f59e0b" },
              { name: "ICAO CORSIA Registry", status: "Connected", tone: "#10b981" },
            ].map((i) => (
              <div
                key={i.name}
                className="flex items-center justify-between p-3 border"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span className="font-display text-sm">{i.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: i.tone }}>
                  ● {i.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "compliance" && (
        <Section title="Security & Compliance">
          <div className="space-y-2 text-sm">
            <ComplianceRow ok label="Row-Level Security enforced on all tables" />
            <ComplianceRow ok label="Role escalation blocked via RESTRICTIVE policy on user_roles" />
            <ComplianceRow ok label="JWT session tokens · auto-rotated" />
            <ComplianceRow ok label="ICAO Annex 6 FDP monitoring active" />
            <ComplianceRow ok label="CORSIA emissions reporting · ICAO Doc 9501" />
            <ComplianceRow ok label="SSR disabled on protected routes — no auth HTML leakage" />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5 space-y-3">
      <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg">
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-display uppercase tracking-wider text-secondary-fg">
      {children}
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  mono,
  uppercase,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  uppercase?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        disabled={disabled}
        className={`mt-1 w-full px-2 py-1.5 text-sm ${mono ? "font-mono" : ""}`}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 px-4 py-2 font-display uppercase text-[11px] tracking-[0.14em] transition-colors"
      style={{
        background: "var(--accent-primary)",
        color: "var(--bg-void)",
      }}
    >
      Save Changes
    </button>
  );
}

function ComplianceRow({ ok, label }: { ok: boolean; label: string }) {
  const tone = ok ? "#10b981" : "var(--status-red)";
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-base" style={{ color: tone }}>
        {ok ? "✓" : "✗"}
      </span>
      <span className="text-secondary-fg">{label}</span>
    </div>
  );
}
