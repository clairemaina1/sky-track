import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SkytrackLogo } from "@/components/brand/SkytrackLogo";

export const Route = createFileRoute("/login")({ component: LoginPage });

type UIState = "idle" | "loading" | "success" | "error";
type Mode = "magic" | "password";

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("magic");
  const [ui, setUi] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, [nav]);

  function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!validEmail(trimmed)) {
      setErrorMsg("Enter a valid email address.");
      setUi("error");
      return;
    }
    if (mode === "password" && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setUi("error");
      return;
    }

    setUi("loading");
    setErrorMsg("");

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
        });
        if (error) throw error;
        setUi("success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) {
          // try signup fallback
          const { error: e2 } = await supabase.auth.signUp({
            email: trimmed,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
          if (e2) throw e2;
        }
        nav({ to: "/" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setErrorMsg(
        msg.includes("60 seconds")
          ? "Please wait 60 seconds before requesting another link."
          : msg,
      );
      setUi("error");
    }
  }

  function reset() {
    setEmail("");
    setPassword("");
    setUi("idle");
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const interactive = ui !== "loading" && ui !== "success";

  return (
    <>
      <style>{`
        @keyframes sky-fadeup { from { opacity:0; transform: translateY(12px);} to {opacity:1; transform:none;} }
        @keyframes sky-spin { to { transform: rotate(360deg); } }
        @keyframes sky-pulse { 0%,100%{opacity:.35} 50%{opacity:.9} }
        @keyframes sky-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes sky-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .sky-fade-1 { animation: sky-fadeup .5s cubic-bezier(.16,1,.3,1) .05s both; }
        .sky-fade-2 { animation: sky-fadeup .5s cubic-bezier(.16,1,.3,1) .15s both; }
        .sky-fade-3 { animation: sky-fadeup .5s cubic-bezier(.16,1,.3,1) .25s both; }
        .sky-fade-4 { animation: sky-fadeup .5s cubic-bezier(.16,1,.3,1) .35s both; }
        .sky-spin { animation: sky-spin .8s linear infinite; }
        .sky-pulse { animation: sky-pulse 2.4s ease-in-out infinite; }
        .sky-scanline { animation: sky-scan 6s linear infinite; }
        .sky-shimmer {
          background-size: 200% auto;
          background-image: linear-gradient(90deg, var(--accent-primary) 0%, color-mix(in oklab, var(--accent-primary) 55%, white) 50%, var(--accent-primary) 100%);
          animation: sky-shimmer 3s linear infinite;
        }
        .sky-grid {
          background-image:
            linear-gradient(color-mix(in oklab, var(--accent-primary) 12%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklab, var(--accent-primary) 12%, transparent) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-void p-4">
        {/* Background layers */}
        <div className="absolute inset-0 sky-grid pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px 400px at 50% 40%, color-mix(in oklab, var(--accent-primary) 18%, transparent), transparent 70%)",
          }}
        />
        <div
          className="absolute left-0 right-0 h-px sky-scanline pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent-primary) 60%, transparent), transparent)",
            top: 0,
          }}
        />

        {/* Corner telemetry */}
        <div className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-fg sky-fade-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 sky-pulse" />
            SKYTRACK AAOS · LINK SECURE
          </div>
        </div>
        <div className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-fg sky-fade-1">
          ICAO · {new Date().toISOString().slice(0, 16).replace("T", " ")}Z
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-fg sky-fade-1">
          <span>AAOS v1.0</span>
          <span>NODE · OPS-01 · NOMINAL</span>
        </div>

        {/* Card */}
        <div className="relative w-full max-w-[440px] sky-fade-2">
          <div
            className="absolute -inset-px rounded-sm pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--accent-primary) 50%, transparent), transparent 60%)",
              filter: "blur(1px)",
            }}
          />
          <div
            className="relative panel p-8"
            style={{
              backdropFilter: "blur(8px)",
              background: "color-mix(in oklab, var(--surface) 92%, transparent)",
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-7 sky-fade-2">
              <SkytrackLogo size={44} showWordmark={false} />
              <div>
                <div
                  className="font-display font-bold text-xl tracking-[0.18em]"
                  style={{
                    background: "linear-gradient(135deg, #3DD9FF 0%, #00C2A8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  SKYTRACK
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-fg">
                  Aviation Operating System
                </div>
              </div>
            </div>

            <div className="sky-fade-3 mb-1">
              <h1 className="font-display text-2xl text-primary-fg">Authenticate</h1>
            </div>
            <p className="sky-fade-3 text-sm text-secondary-fg mb-6 leading-relaxed">
              {mode === "magic"
                ? "Enter your email — we'll send a secure, passwordless sign-in link valid for 60 minutes."
                : "Sign in with email and password. New emails create an account."}
            </p>

            {ui === "success" ? (
              <div className="sky-fade-4 space-y-4">
                <div
                  className="flex items-center gap-3 p-4 border"
                  style={{
                    borderColor: "color-mix(in oklab, var(--accent-primary) 40%, transparent)",
                    background: "color-mix(in oklab, var(--accent-primary) 8%, transparent)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-sm text-primary-fg">Magic link transmitted</div>
                    <div className="font-mono text-[11px] text-secondary-fg mt-0.5 break-all">
                      → {email.trim()}
                    </div>
                  </div>
                </div>
                <button onClick={reset} className="btn-cmd w-full justify-center">
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="sky-fade-4 space-y-4">
                <div>
                  <label className="font-display uppercase text-[10px] tracking-[0.18em] text-secondary-fg">
                    Email
                  </label>
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    placeholder="operator@airline.com"
                    disabled={!interactive}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (ui === "error") {
                        setUi("idle");
                        setErrorMsg("");
                      }
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="w-full mt-1.5 px-3 py-2.5 bg-surface border font-mono text-sm text-primary-fg placeholder:text-secondary-fg/60 outline-none transition-all disabled:opacity-50"
                    style={{
                      borderColor:
                        ui === "error"
                          ? "var(--status-red)"
                          : focused
                            ? "var(--accent-primary)"
                            : "var(--border-subtle)",
                      borderRadius: 2,
                      boxShadow: focused
                        ? "0 0 0 1px var(--accent-primary), 0 0 12px var(--accent-glow)"
                        : "none",
                      caretColor: "var(--accent-primary)",
                    }}
                  />
                </div>

                {mode === "password" && (
                  <div>
                    <label className="font-display uppercase text-[10px] tracking-[0.18em] text-secondary-fg">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="current-password"
                      value={password}
                      disabled={!interactive}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 bg-surface border font-mono text-sm text-primary-fg outline-none disabled:opacity-50"
                      style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}
                    />
                  </div>
                )}

                {ui === "error" && errorMsg && (
                  <div
                    className="flex items-start gap-2 p-2.5 border font-mono text-[11px]"
                    style={{
                      borderColor: "color-mix(in oklab, var(--status-red) 50%, transparent)",
                      background: "color-mix(in oklab, var(--status-red) 10%, transparent)",
                      color: "var(--status-red)",
                    }}
                  >
                    <span>⚠</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!interactive}
                  className="btn-cmd w-full justify-center mt-2 disabled:opacity-60"
                >
                  {ui === "loading" ? (
                    <span className="flex items-center gap-2">
                      <svg className="sky-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Transmitting…
                    </span>
                  ) : mode === "magic" ? (
                    "Send Magic Link →"
                  ) : (
                    "Authenticate →"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "magic" ? "password" : "magic");
                    setUi("idle");
                    setErrorMsg("");
                  }}
                  className="w-full text-center font-mono text-[11px] uppercase tracking-[0.16em] text-secondary-fg hover:text-primary-fg transition-colors"
                >
                  {mode === "magic" ? "Use password instead" : "Use magic link instead"}
                </button>
              </form>
            )}

            <div
              className="mt-6 pt-4 border-t text-[10px] font-mono uppercase tracking-[0.14em] text-secondary-fg leading-relaxed"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              By authenticating you accept SkyTrack operational terms. Platform
              processes ICAO-compliant aviation data.
            </div>
          </div>

          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-secondary-fg sky-fade-4">
            SKYTRACK AAOS v1.0 · ICAO COMPLIANT · CARBON NEUTRAL 2030
          </div>
        </div>
      </div>
    </>
  );
}
