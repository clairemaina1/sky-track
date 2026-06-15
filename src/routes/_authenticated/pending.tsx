import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProvisionStatus } from "@/hooks/use-category";
import { Clock, LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pending")({
  component: PendingScreen,
});

function PendingScreen() {
  const { data } = useProvisionStatus();
  const status = data?.pending?.status ?? "pending";
  const email = data?.pending?.email ?? "";

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full p-8 border" style={{ borderColor: "var(--border-subtle)", borderRadius: 4, background: "var(--bg-panel)" }}>
        <div className="flex items-center gap-3 mb-4">
          {status === "rejected" ? (
            <ShieldCheck className="w-6 h-6 text-red-400" />
          ) : (
            <Clock className="w-6 h-6 text-amber-400" />
          )}
          <div className="font-display text-lg uppercase tracking-[0.16em]">
            {status === "rejected" ? "Access Denied" : "Awaiting Approval"}
          </div>
        </div>
        <p className="text-secondary-fg text-sm leading-relaxed mb-2">
          {status === "rejected"
            ? "Your access request was not approved. Contact the SkyTrack administrator."
            : "Your account is queued for review. The SkyTrack administrator will assign your organization, role, and category access shortly."}
        </p>
        {email && <p className="text-xs font-mono text-secondary-fg mt-3">{email}</p>}
        <button
          onClick={signOut}
          className="mt-6 flex items-center gap-2 text-xs font-display uppercase tracking-[0.14em] text-secondary-fg hover:text-primary-fg"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}
