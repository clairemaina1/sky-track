import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { runAOGCascade } from "@/lib/eventEngine";
import type { Aircraft } from "@/lib/types";
import { useAlertStore } from "@/stores/alertStore";
import { useCurrentOrgId } from "@/hooks/use-org";

type Suggestion = { label: string; hint: string; run: () => void | Promise<void> };

const MODULES: Record<string, string> = {
  fleet: "/fleet",
  mro: "/mro",
  maintenance: "/mro",
  crew: "/crew",
  routing: "/routing",
  route: "/routing",
  map: "/routing",
  cargo: "/cargo",
  disruption: "/disruption",
  recovery: "/disruption",
  home: "/",
  command: "/",
  center: "/",
};

interface EntityHit {
  kind: "aircraft" | "flight" | "crew";
  id: string;
  label: string;
  sub: string;
}

export function CommandInput() {
  const nav = useNavigate();
  const pushToast = useAlertStore((s) => s.pushToast);
  const [orgId] = useCurrentOrgId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [hits, setHits] = useState<EntityHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl-K toggle
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else {
      setQ("");
      setSel(0);
      setHits([]);
    }
  }, [open]);

  // Live entity search (debounced) — tail, flight number, crew name
  useEffect(() => {
    const text = q.trim();
    if (!open || !orgId || text.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const like = `%${text}%`;
      const [ac, fl, cr] = await Promise.all([
        supabase
          .from("aircraft")
          .select("id, tail_number, model, status")
          .eq("org_id", orgId)
          .or(`tail_number.ilike.${like},model.ilike.${like}`)
          .limit(5),
        supabase
          .from("flights")
          .select("id, flight_number, origin_icao, destination_icao, status")
          .eq("org_id", orgId)
          .or(`flight_number.ilike.${like},origin_icao.ilike.${like},destination_icao.ilike.${like}`)
          .limit(5),
        supabase
          .from("crew")
          .select("id, full_name, role, base_airport")
          .eq("org_id", orgId)
          .or(`full_name.ilike.${like},role.ilike.${like},employee_id.ilike.${like}`)
          .limit(5),
      ]);
      if (cancelled) return;
      const next: EntityHit[] = [];
      for (const a of ac.data ?? [])
        next.push({ kind: "aircraft", id: a.id, label: `${a.tail_number} · ${a.model}`, sub: a.status });
      for (const f of fl.data ?? [])
        next.push({
          kind: "flight",
          id: f.id,
          label: `${f.flight_number} · ${f.origin_icao} → ${f.destination_icao}`,
          sub: f.status,
        });
      for (const c of cr.data ?? [])
        next.push({ kind: "crew", id: c.id, label: `${c.full_name} · ${c.role}`, sub: c.base_airport });
      setHits(next);
      setSel(0);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, open, orgId]);

  const suggestions = useSuggestions(q, hits, nav, pushToast);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 h-7 border bg-surface text-secondary-fg hover:text-primary-fg transition-colors"
        style={{ borderColor: "var(--border-subtle)", borderRadius: 2 }}
        title="Command palette (⌘K)"
      >
        <span className="font-display uppercase text-[10px] tracking-[0.12em]">Command</span>
        <kbd
          className="font-mono text-[9px] px-1 py-0.5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel w-[640px] max-w-[92vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px var(--accent-primary), 0 0 30px var(--accent-glow)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <span className="font-mono text-accent text-sm">{">"}</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(suggestions.length - 1, s + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(0, s - 1));
                  } else if (e.key === "Enter") {
                    const s = suggestions[sel];
                    if (s) {
                      void s.run();
                      setOpen(false);
                    }
                  }
                }}
                placeholder="Search tail · flight # · crew · or type: go fleet, aog 5Y-MOM"
                className="flex-1 bg-transparent outline-none font-mono text-sm placeholder:text-secondary-fg/60"
              />
              <span className="font-display uppercase text-[9px] tracking-wider text-secondary-fg">
                NL Parser
              </span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {suggestions.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-secondary-fg">
                  Try: <span className="font-mono text-accent">5Y-KQA</span>,{" "}
                  <span className="font-mono text-accent">ST-101</span>,{" "}
                  <span className="font-mono text-accent">go mro</span>,{" "}
                  <span className="font-mono text-accent">aog 5Y-MOM</span>
                </div>
              )}
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => {
                    void s.run();
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 flex items-center justify-between"
                  style={{ background: i === sel ? "var(--bg-elevated)" : "transparent" }}
                >
                  <span className="font-mono text-sm">{s.label}</span>
                  <span className="font-display uppercase text-[9px] tracking-wider text-secondary-fg">
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
            <div
              className="px-4 py-2 border-t flex justify-between text-[10px] font-mono text-secondary-fg"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-panel)" }}
            >
              <span>↑↓ select · ↵ jump · esc close</span>
              <span>SkyTrack NL v0.2</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function useSuggestions(
  q: string,
  hits: EntityHit[],
  nav: ReturnType<typeof useNavigate>,
  pushToast: (a: import("@/lib/types").Alert) => void,
): Suggestion[] {
  const text = q.trim().toLowerCase();
  if (!text) {
    return [
      { label: "go fleet", hint: "Navigate", run: () => nav({ to: "/fleet" }) },
      { label: "go mro", hint: "Navigate", run: () => nav({ to: "/mro" }) },
      { label: "go crew", hint: "Navigate", run: () => nav({ to: "/crew" }) },
      { label: "go disruption", hint: "Navigate", run: () => nav({ to: "/disruption" }) },
    ];
  }

  const out: Suggestion[] = [];

  // Entity hits first — surface real records
  for (const h of hits) {
    if (h.kind === "aircraft") {
      out.push({
        label: `→ ${h.label}`,
        hint: `Aircraft · ${h.sub}`,
        run: () => nav({ to: "/fleet/$id", params: { id: h.id } }),
      });
    } else if (h.kind === "flight") {
      out.push({
        label: `→ ${h.label}`,
        hint: `Flight · ${h.sub}`,
        run: () => nav({ to: "/flights/$id", params: { id: h.id } }),
      });
    } else {
      out.push({
        label: `→ ${h.label}`,
        hint: `Crew · ${h.sub}`,
        run: () => nav({ to: "/crew/$id", params: { id: h.id } }),
      });
    }
  }

  // GO / NAV
  const navMatch = text.match(/^(?:go|nav|open|show)\s+(\w+)/);
  const moduleKey = navMatch?.[1] ?? text;
  for (const [k, path] of Object.entries(MODULES)) {
    if (k.startsWith(moduleKey)) {
      out.push({ label: `go → ${path}`, hint: "Navigate", run: () => nav({ to: path as never }) });
    }
  }

  // AOG / GROUND <tail>
  const aogMatch = text.match(/^(?:aog|ground|aog\s+ground)\s+([a-z0-9-]+)/i);
  if (aogMatch) {
    const tail = aogMatch[1].toUpperCase();
    out.push({
      label: `Declare AOG → ${tail}`,
      hint: "Cascade",
      run: async () => {
        const { data } = await supabase.from("aircraft").select("*").ilike("tail_number", tail).maybeSingle();
        if (!data) return;
        await supabase.from("aircraft").update({ status: "AOG" }).eq("id", data.id);
        await runAOGCascade(data as Aircraft);
        pushToast({
          id: crypto.randomUUID(),
          severity: "critical",
          type: "AOG",
          title: `AOG · ${tail}`,
          body: `AOG cascade triggered for ${tail}`,
          source_id: data.id,
          source_table: "aircraft",
          acknowledged: false,
          created_at: new Date().toISOString(),
          acknowledged_by: null,
        });
        nav({ to: "/fleet" });
      },
    });
  }

  // FUEL <orig> <dest>
  const fuelMatch = text.match(/^fuel\s+([a-z]{4})\s+([a-z]{4})/);
  if (fuelMatch) {
    out.push({
      label: `Fuel sim ${fuelMatch[1].toUpperCase()} → ${fuelMatch[2].toUpperCase()}`,
      hint: "Routing",
      run: () => nav({ to: "/routing" }),
    });
  }

  return out;
}
