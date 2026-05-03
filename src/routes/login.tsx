import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="panel w-[420px] p-8">
        <div className="text-center mb-6">
          <div className="font-display font-bold text-3xl tracking-wider text-accent">SKY//TRACK</div>
          <div className="text-secondary-fg text-xs mt-1">Agentic Aviation Operating System</div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface border focus:outline-none font-mono text-sm"
              style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px var(--accent-primary), 0 0 12px var(--accent-glow)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "")} />
          </div>
          <div>
            <label className="font-display uppercase text-[10px] tracking-[0.12em] text-secondary-fg">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface border focus:outline-none font-mono text-sm"
              style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }} />
          </div>
          {err && <div className="text-xs font-mono" style={{ color: "var(--status-red)" }}>{err}</div>}
          <button type="submit" disabled={loading} className="btn-cmd w-full justify-center mt-2">
            {loading ? "…" : mode === "signin" ? "Authenticate" : "Create account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-secondary-fg hover:text-primary-fg mt-2">
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
