import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/layout/Shell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const [state, setState] = useState<"loading" | "ok" | "out">("loading");
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState(data.session ? "ok" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setState(s ? "ok" : "out");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  if (state === "loading") return <div className="min-h-screen flex items-center justify-center text-secondary-fg font-mono text-xs">INITIALIZING…</div>;
  if (state === "out") {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  return <Shell />;
}
void redirect;
