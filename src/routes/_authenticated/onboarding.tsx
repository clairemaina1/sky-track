import { pageHead } from "@/lib/routeHead";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plane, GraduationCap, ArrowRight, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: pageHead({ title: "Onboarding — SkyTrack AAOS", description: "Set up your operation: name your org, pick a tier, and choose seed data.", path: "/onboarding" }),
  component: OnboardingPage,
});

type Tier = "commercial" | "flight_school";

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !tier) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_organization_with_admin", {
      _name: name.trim(),
      _tier: tier,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    const newOrgId = data as unknown as string;
    window.localStorage.setItem("skytrack.org_id", newOrgId);
    await qc.invalidateQueries({ queryKey: ["my-orgs"] });
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="font-display text-xs uppercase tracking-[0.2em] text-secondary-fg mb-2">
            Welcome to SkyTrack
          </div>
          <h1 className="font-display text-2xl tracking-wide">
            {step === 1 ? "Set up your organization" : "Pick your operation type"}
          </h1>
        </div>

        <div
          className="border bg-panel p-6"
          style={{ borderColor: "var(--border-subtle)", borderRadius: 4 }}
        >
          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary-fg flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Organization name
                </span>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Northern Air Charter"
                  className="mt-2 w-full bg-transparent border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
                  style={{ borderColor: "var(--border-subtle)" }}
                />
              </label>
              <button
                disabled={name.trim().length < 2}
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-display text-xs uppercase tracking-[0.12em] disabled:opacity-40"
                style={{ background: "var(--accent-primary)", color: "white", borderRadius: 2 }}
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {(
                [
                  {
                    id: "commercial" as const,
                    label: "Commercial Airline / Charter",
                    desc: "Fleet ops, MRO, crew, cargo, disruption management",
                    Icon: Plane,
                  },
                  {
                    id: "flight_school" as const,
                    label: "Flight School",
                    desc: "Training schedules, student progression, instructor allocation",
                    Icon: GraduationCap,
                  },
                ]
              ).map(({ id, label, desc, Icon }) => {
                const active = tier === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTier(id)}
                    className="w-full flex items-start gap-3 p-4 border text-left transition-colors"
                    style={{
                      borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
                      background: active ? "var(--bg-elevated)" : "transparent",
                      borderRadius: 2,
                    }}
                  >
                    <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: active ? "var(--accent-primary)" : "var(--text-secondary)" }} />
                    <div className="flex-1">
                      <div className="font-display text-sm">{label}</div>
                      <div className="text-xs text-secondary-fg mt-0.5">{desc}</div>
                    </div>
                  </button>
                );
              })}

              {error && <div className="text-xs text-red-400">{error}</div>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 font-display text-xs uppercase tracking-[0.12em] border"
                  style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}
                >
                  Back
                </button>
                <button
                  disabled={!tier || busy}
                  onClick={handleCreate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-display text-xs uppercase tracking-[0.12em] disabled:opacity-40"
                  style={{ background: "var(--accent-primary)", color: "white", borderRadius: 2 }}
                >
                  {busy ? "Creating…" : "Create organization"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-[10px] font-mono uppercase tracking-[0.16em] text-secondary-fg">
          Step {step} of 2
        </div>
      </div>
    </div>
  );
}
