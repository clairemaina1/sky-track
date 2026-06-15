import { createFileRoute, redirect, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/layout/Shell";

// Auth-protected layout with provisioning gate.
// `ssr: false` keeps protected HTML out of SSR. The post-auth effect
// checks if the user has been approved (org member or super_admin); if
// not, they're routed to /pending with no data access.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthGate,
});

function AuthGate() {
  const [authed, setAuthed] = useState(true);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [provisionChecked, setProvisionChecked] = useState(false);
  const [provisioned, setProvisioned] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setAuthed(false);
        window.location.href = "/login";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !mounted) return;
      const [{ data: roles }, { data: members }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("organization_members").select("org_id").eq("user_id", u.user.id),
      ]);
      if (!mounted) return;
      const isSuper = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
      const ok = isSuper || (members ?? []).length > 0;
      setProvisioned(ok);
      setProvisionChecked(true);
      if (!ok && path !== "/pending") {
        navigate({ to: "/pending" });
      } else if (ok && path === "/pending") {
        navigate({ to: "/" });
      }
    })();
    return () => { mounted = false; };
  }, [path, navigate]);

  if (!authed) return null;
  if (!provisionChecked) return null;
  if (!provisioned && path !== "/pending") return null;
  return <Shell />;
}
