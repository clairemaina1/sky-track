import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkytrackLogo } from "@/components/brand/SkytrackLogo";

// Types for beta supabase.auth.oauth namespace
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
}
function oauthApi(): OAuthApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.auth as any).oauth as OAuthApi;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return data;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="panel p-6 max-w-md text-primary-fg">
        <h1 className="font-display text-lg mb-2">Authorization error</h1>
        <p className="text-sm text-secondary-fg">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="panel p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <SkytrackLogo size={40} showWordmark={false} />
          <div>
            <div className="font-display font-bold text-lg tracking-[0.16em] text-primary-fg">SKYTRACK</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-fg">Authorize connection</div>
          </div>
        </div>

        <h1 className="font-display text-xl text-primary-fg mb-2">
          Connect {clientName} to your SkyTrack account
        </h1>
        <p className="text-sm text-secondary-fg mb-4 leading-relaxed">
          This lets <strong className="text-primary-fg">{clientName}</strong> call SkyTrack tools as you.
          It can read fleet, flight, crew and cargo data that your role and organization already give you access to.
          This does not bypass SkyTrack's permissions or backend policies.
        </p>

        {email && (
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-secondary-fg mb-6">
            Signed in as <span className="text-primary-fg">{email}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 border text-[11px] font-mono"
            style={{ borderColor: "color-mix(in oklab, var(--status-red) 50%, transparent)", background: "color-mix(in oklab, var(--status-red) 10%, transparent)", color: "var(--status-red)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button disabled={busy} onClick={() => decide(false)} className="btn-cmd flex-1 justify-center" style={{ opacity: busy ? 0.6 : 1 }}>
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="btn-cmd flex-1 justify-center"
            style={{
              background: "var(--accent-primary)",
              color: "black",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Working…" : "Approve"}
          </button>
        </div>
      </div>
    </main>
  );
}
