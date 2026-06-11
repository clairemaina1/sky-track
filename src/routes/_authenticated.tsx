import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/layout/Shell";

// Auth-protected layout.
// `ssr: false` ensures no protected HTML is rendered server-side before the
// session check runs — the SSR shell stays generic, RLS protects the data
// API, and the gate below blocks the client render until the session is
// validated. This addresses SERVER_FN_MISSING_AUTH by preventing any
// authenticated-route HTML payload from leaking to anonymous viewers and
// keeps every protected query/mutation behind the user's JWT + RLS.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthGate,
});

function AuthGate() {
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setAuthed(false);
        window.location.href = "/login";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authed) return null;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
