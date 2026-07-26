import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { useSuperAdmin } from "@/hooks/use-category";
import { LifeBuoy, Send, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: pageHead({
    title: "Support — SkyTrack",
    description: "Open a ticket, track status, and see recent responses. SLA hours: Mon–Fri 08:00–20:00 EAT · Critical 24/7.",
    path: "/support",
  }),
  component: SupportPage,
});

interface Ticket {
  id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  org_id: string | null;
  user_id: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: "border-red-500/50 text-red-300 bg-red-500/10",
  high: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  normal: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  low: "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
};
const STATUS_ICON: Record<string, JSX.Element> = {
  open: <Clock className="w-3.5 h-3.5" />,
  in_progress: <AlertTriangle className="w-3.5 h-3.5" />,
  resolved: <CheckCircle2 className="w-3.5 h-3.5" />,
};

function SupportPage() {
  const org = useCurrentOrg();
  const { data: isSuper = false } = useSuperAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    body: "",
    category: "general",
    priority: "normal",
  });

  async function load() {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setTickets((data ?? []) as Ticket[]);
  }
  useEffect(() => { load(); }, [org?.org_id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("support_tickets").insert({
        subject: form.subject.trim().slice(0, 200),
        body: form.body.trim().slice(0, 4000),
        category: form.category,
        priority: form.priority,
        user_id: u.user.id,
        org_id: org?.org_id ?? null,
      });
      if (error) throw error;
      toast.success("Ticket opened — we'll respond within SLA.");
      setForm({ subject: "", body: "", category: "general", priority: "normal" });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const patch: Partial<Ticket> = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else await load();
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-center gap-3">
        <LifeBuoy className="w-5 h-5 text-accent" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">Support</h1>
          <p className="text-secondary-fg text-sm">
            Response SLA: <span className="text-primary-fg">Mon–Fri 08:00–20:00 EAT</span> ·
            Critical: <span className="text-red-300">24/7 with 1h ack</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="border border-border-subtle bg-panel p-4 space-y-3">
          <div className="font-display uppercase text-xs tracking-widest text-primary-fg">Open a ticket</div>
          <input
            className="w-full bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono"
            placeholder="Subject (e.g. AOG on 5Y-KQZ — engine start fault)"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            maxLength={200}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono"
            >
              <option value="general">General</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="integration">Integration</option>
              <option value="billing">Billing</option>
              <option value="security">Security</option>
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical · 24/7</option>
            </select>
          </div>
          <textarea
            className="w-full bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono min-h-[140px]"
            placeholder="Describe what's happening, what you expected, and any tail/flight numbers involved."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-accent text-black px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />{loading ? "Sending…" : "Submit ticket"}
          </button>
        </form>

        <section className="border border-border-subtle bg-panel">
          <div className="p-3 border-b border-border-subtle flex items-center justify-between">
            <span className="font-display uppercase text-xs tracking-widest text-primary-fg">
              {isSuper ? "All tickets (super-admin queue)" : "Your tickets"}
            </span>
            <span className="text-[10px] text-secondary-fg font-mono">{tickets.length} showing</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border-subtle">
            {tickets.length === 0 && (
              <div className="p-6 text-center text-sm text-secondary-fg">No tickets yet.</div>
            )}
            {tickets.map((t) => (
              <div key={t.id} className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-mono px-1.5 py-[1px] border rounded-sm uppercase ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.normal}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-secondary-fg">{t.category}</span>
                  <span className="text-[10px] font-mono text-secondary-fg ml-auto flex items-center gap-1">
                    {STATUS_ICON[t.status] ?? <Clock className="w-3.5 h-3.5" />} {t.status}
                  </span>
                </div>
                <div className="font-display text-sm text-primary-fg">{t.subject}</div>
                <div className="text-xs text-secondary-fg whitespace-pre-wrap">{t.body}</div>
                <div className="text-[10px] font-mono text-secondary-fg">
                  {new Date(t.created_at).toISOString().slice(0, 19).replace("T", " ")} UTC
                </div>
                {(isSuper || t.status !== "resolved") && (
                  <div className="flex gap-2 pt-1">
                    {isSuper && t.status !== "in_progress" && (
                      <button onClick={() => updateStatus(t.id, "in_progress")} className="text-[10px] text-accent hover:underline">
                        Mark in progress
                      </button>
                    )}
                    {t.status !== "resolved" && (
                      <button onClick={() => updateStatus(t.id, "resolved")} className="text-[10px] text-green-400 hover:underline">
                        Mark resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
