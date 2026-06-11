import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";

export function SkyChat() {
  const [open, setOpen] = useState(false);
  const [orgId] = useCurrentOrgId();
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => ({ Authorization: `Bearer ${token ?? ""}` }),
      body: () => ({ orgId }),
    }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  if (!orgId || !token) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open SkyTrack Copilot"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #00C2A8)",
            color: "white",
            boxShadow: "0 8px 24px rgba(14,165,233,0.4)",
          }}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[min(95vw,400px)] h-[min(80vh,600px)] flex flex-col rounded-lg overflow-hidden shadow-2xl"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-active)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <div className="font-display uppercase tracking-[0.12em] text-xs text-primary-fg">
                SkyTrack Copilot
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="h-7 w-7 flex items-center justify-center text-secondary-fg hover:text-primary-fg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-secondary-fg text-xs space-y-2">
                <p className="font-mono uppercase tracking-wider text-[10px]">Try asking:</p>
                {[
                  "How many aircraft are AOG right now?",
                  "Give me a fleet performance summary",
                  "What's our crew availability today?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage({ text: q })}
                    className="block w-full text-left px-2 py-1.5 rounded text-[12px] transition-colors hover:bg-elevated border"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <div
                  key={m.id}
                  className={`text-[13px] leading-relaxed ${m.role === "user" ? "text-primary-fg" : "text-secondary-fg"}`}
                >
                  <div className="font-mono uppercase tracking-wider text-[9px] mb-1 text-muted-fg">
                    {m.role === "user" ? "You" : "Copilot"}
                  </div>
                  <div
                    className="px-3 py-2 rounded prose prose-invert prose-sm max-w-none"
                    style={{
                      background: m.role === "user" ? "var(--bg-elevated)" : "transparent",
                      border: m.role === "assistant" ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    {text ? <ReactMarkdown>{text}</ReactMarkdown> : <span className="opacity-60">…</span>}
                  </div>
                </div>
              );
            })}
            {status === "submitted" && (
              <div className="text-xs text-muted-fg font-mono">Thinking…</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || busy) return;
              sendMessage({ text: input.trim() });
              setInput("");
            }}
            className="border-t p-2 flex gap-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fleet, crew, cargo…"
              className="flex-1 bg-transparent text-sm px-2 py-1.5 focus:outline-none text-primary-fg"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-8 w-8 flex items-center justify-center rounded disabled:opacity-40"
              style={{ background: "var(--accent-primary)", color: "white" }}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
