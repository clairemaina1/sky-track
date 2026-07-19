import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { Palette, Globe, Save, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/branding")({
  head: pageHead({ title: "Branding — SkyTrack", description: "White-label your SkyTrack tenant.", path: "/branding" }),
  component: BrandingPage,
});

function BrandingPage() {
  const org = useCurrentOrg();
  const [logoUrl, setLogoUrl] = useState("");
  const [accent, setAccent] = useState("#00c2a8");
  const [subdomain, setSubdomain] = useState("");
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!org?.org_id) return;
    supabase.from("organizations").select("logo_url, accent_color, subdomain, name").eq("id", org.org_id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setLogoUrl(data.logo_url ?? "");
      setAccent(data.accent_color ?? "#00c2a8");
      setSubdomain(data.subdomain ?? "");
    });
  }, [org?.org_id]);

  async function save() {
    if (!org?.org_id) return;
    setSaved(null); setErr(null);
    const sub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("organizations")
      .update({ logo_url: logoUrl || null, accent_color: accent, subdomain: sub || null })
      .eq("id", org.org_id);
    if (error) { setSaved("err"); setErr(error.message); return; }
    setSaved("ok");
  }

  const disabled = org?.role !== "admin";

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">Branding · White-Label</h1>
        <p className="text-secondary-fg text-sm mt-1">Give your operator a personal look. Applied across dashboards & printed reports.</p>
      </header>

      {disabled && <div className="border border-amber-400/40 text-amber-300 p-3 text-xs">Only org admins can edit branding.</div>}

      <section className="border border-border-subtle bg-panel p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary-fg"><ImageIcon className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Logo URL</span></div>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://cdn.example.com/logo.png" disabled={disabled}
          className="w-full bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono" />
        {logoUrl && <div className="p-3 border border-border-subtle bg-void"><img src={logoUrl} alt="Logo preview" className="h-10 object-contain" /></div>}
      </section>

      <section className="border border-border-subtle bg-panel p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary-fg"><Palette className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Accent Color</span></div>
        <div className="flex items-center gap-3">
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} disabled={disabled} className="w-14 h-10 bg-transparent border border-border-subtle" />
          <input value={accent} onChange={(e) => setAccent(e.target.value)} disabled={disabled}
            className="w-40 bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono" />
          <div className="px-4 py-2 border font-display uppercase text-xs tracking-widest" style={{ borderColor: accent, color: accent }}>
            PREVIEW
          </div>
        </div>
      </section>

      <section className="border border-border-subtle bg-panel p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary-fg"><Globe className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Sub-domain</span></div>
        <div className="flex items-center gap-2">
          <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="kenyaairways" disabled={disabled}
            className="w-56 bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono" />
          <span className="text-secondary-fg text-sm font-mono">.skytrack.aero</span>
        </div>
        <p className="text-[11px] text-secondary-fg">Reserve your sub-domain now. DNS provisioning is triggered on publish. Lowercase letters, numbers and hyphens only.</p>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={disabled} className="btn-cmd inline-flex items-center gap-2"><Save className="w-4 h-4" />Save branding</button>
        {saved === "ok" && <span className="text-xs text-emerald-400">Saved.</span>}
        {saved === "err" && <span className="text-xs text-amber-300">{err}</span>}
      </div>
    </div>
  );
}
