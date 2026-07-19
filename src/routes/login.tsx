import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkytrackLogo } from "@/components/brand/SkytrackLogo";


export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — SkyTrack" },
      { name: "description", content: "Sign in to SkyTrack — flight delay mitigation, asset utilization and compliance-ready carbon reporting for airlines and flight schools." },
      { property: "og:title", content: "Sign in — SkyTrack" },
      { property: "og:description", content: "Access your SkyTrack operations command center." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
});

function safeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

type UIState = "idle" | "loading" | "success" | "error";
type Mode = "signin" | "signup" | "magic";

function LoginPage() {
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [ui, setUi] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = target;
    });
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [target]);

  function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!validEmail(trimmed)) { setErrorMsg("Enter a valid email address."); setUi("error"); return; }
    if ((mode === "signin" || mode === "signup") && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters."); setUi("error"); return;
    }

    setUi("loading"); setErrorMsg("");
    const redirectUrl = window.location.origin + target;

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: redirectUrl, shouldCreateUser: true },
        });
        if (error) throw error;
        setUi("success");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) throw error;
        window.location.href = target;
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmed, password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        window.location.href = target;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setErrorMsg(msg.includes("60 seconds") ? "Please wait 60 seconds before requesting another link." : msg);
      setUi("error");
    }
  }

  const interactive = ui !== "loading" && ui !== "success";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--bg-panel)" }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #3DD9FF 0%, #00C2A8 100%)" }}
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12l9-4-3 8 4-2 4 4 6-14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-primary-fg tracking-tight">SkyTrack</h1>
          <p className="text-sm text-secondary-fg mt-1">Aviation operations, simplified.</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 20px 40px -20px rgba(0,0,0,0.25)",
          }}
        >
          {/* Tabs */}
          <div
            className="flex p-0.5 rounded-lg mb-6"
            style={{ background: "color-mix(in oklab, var(--bg-panel) 70%, transparent)" }}
          >
            {([
              { id: "signin" as const, label: "Sign in" },
              { id: "signup" as const, label: "Create account" },
              { id: "magic" as const, label: "Magic link" },
            ]).map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMode(m.id); setUi("idle"); setErrorMsg(""); }}
                  className="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
                  style={{
                    background: active ? "var(--bg-elevated)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {ui === "success" ? (
            <div className="text-center py-4">
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: "color-mix(in oklab, var(--accent-primary) 15%, transparent)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="text-primary-fg font-medium">Check your inbox</div>
              <div className="text-sm text-secondary-fg mt-1 break-words">We sent a sign-in link to {email.trim()}.</div>
              <button
                onClick={() => { setUi("idle"); setEmail(""); }}
                className="mt-4 text-xs text-secondary-fg hover:text-primary-fg underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-fg mb-1.5" htmlFor="email">Email</label>
                <input
                  id="email"
                  ref={inputRef}
                  type="email"
                  autoComplete="email"
                  required
                  disabled={!interactive}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (ui === "error") { setUi("idle"); setErrorMsg(""); } }}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-primary-fg outline-none transition-colors"
                  style={{
                    background: "var(--bg-panel)",
                    border: `1px solid ${ui === "error" ? "var(--status-red)" : "var(--border-subtle)"}`,
                  }}
                />
              </div>

              {(mode === "signin" || mode === "signup") && (
                <div>
                  <label className="block text-xs font-medium text-secondary-fg mb-1.5" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    disabled={!interactive}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-primary-fg outline-none"
                    style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              )}

              {ui === "error" && errorMsg && (
                <div className="text-xs" style={{ color: "var(--status-red)" }}>{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={!interactive}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #3DD9FF 0%, #00C2A8 100%)",
                  color: "white",
                }}
              >
                {ui === "loading"
                  ? "Please wait…"
                  : mode === "magic" ? "Send magic link"
                  : mode === "signin" ? "Sign in"
                  : "Create account"}
              </button>

              {mode === "signin" && (
                <div className="text-center text-xs text-secondary-fg">
                  New to SkyTrack?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary-fg hover:underline">
                    Create an account
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-secondary-fg mt-6 leading-relaxed">
          By continuing you agree to SkyTrack&apos;s terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
