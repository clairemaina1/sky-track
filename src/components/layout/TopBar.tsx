import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Building2, Sun, Moon, Languages, Menu, Layers } from "lucide-react";
import { CommandInput } from "@/components/ui/CommandInput";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { useMyOrgs, useCurrentOrgId } from "@/hooks/use-org";
import { useUiStore } from "@/stores/uiStore";
import { useMyCategories, useCurrentCategory, CATEGORY_LABEL, CATEGORY_ACCENT, type SkytrackCategory } from "@/hooks/use-category";

function CategorySwitcher() {
  const [orgId] = useCurrentOrgId();
  const { data: cats = [] } = useMyCategories(orgId);
  const [current, setCurrent] = useCurrentCategory();
  if (cats.length === 0) return null;
  if (cats.length === 1) {
    const c = cats[0];
    return (
      <div className="hidden md:flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" style={{ color: CATEGORY_ACCENT[c] }} />
        <span className="font-display text-[11px] uppercase tracking-[0.14em]" style={{ color: CATEGORY_ACCENT[c] }}>
          {CATEGORY_LABEL[c]}
        </span>
      </div>
    );
  }
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <Layers className="w-3.5 h-3.5" style={{ color: current ? CATEGORY_ACCENT[current] : "currentColor" }} />
      <select
        value={current ?? ""}
        onChange={(e) => setCurrent(e.target.value as SkytrackCategory)}
        className="bg-transparent border rounded px-2 py-1 text-[11px] font-mono focus:outline-none"
        style={{ borderColor: "var(--border-subtle)", color: current ? CATEGORY_ACCENT[current] : "currentColor" }}
        aria-label="Switch category"
      >
        {cats.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
      </select>
    </div>
  );
}

function OrgSwitcher() {
  const { data: orgs = [] } = useMyOrgs();
  const [orgId, setOrgId] = useCurrentOrgId();
  if (orgs.length === 0) return null;
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <Building2 className="w-3.5 h-3.5 text-secondary-fg" />
      <select
        value={orgId ?? ""}
        onChange={(e) => setOrgId(e.target.value)}
        className="bg-transparent border rounded px-2 py-1 text-[11px] font-mono text-secondary-fg focus:outline-none"
        style={{ borderColor: "var(--border-subtle)" }}
        aria-label="Switch organization"
      >
        {orgs.map((o) => (
          <option key={o.org_id} value={o.org_id}>
            {o.name} · {o.tier === "flight_school" ? "Flight School" : "Commercial"}
          </option>
        ))}
      </select>
    </div>
  );
}

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggle = useUiStore((s) => s.toggleTheme);
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      className="h-7 w-7 flex items-center justify-center text-secondary-fg hover:text-primary-fg transition-colors"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function LangToggle() {
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  return (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      title={lang === "en" ? "Passer en français" : "Switch to English"}
      aria-label="Toggle language"
      className="h-7 px-1.5 flex items-center gap-1 text-secondary-fg hover:text-primary-fg transition-colors"
    >
      <Languages className="w-3.5 h-3.5" />
      <span className="font-mono text-[10px] uppercase">{lang}</span>
    </button>
  );
}

export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const utc = now ? now.toISOString().slice(11, 19) + " UTC" : "";
  return (
    <header
      className="h-12 flex items-center justify-between px-2 sm:px-4 border-b bg-panel gap-2"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="md:hidden h-8 w-8 flex items-center justify-center text-secondary-fg"
          aria-label="Open navigation"
          onClick={() => setMobileNav(true)}
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="font-display uppercase text-xs tracking-[0.12em] text-secondary-fg truncate">
          {path === "/" ? "Command Center" : path.replace("/", "").toUpperCase()}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <OrgSwitcher />
        <CategorySwitcher />
        <div className="hidden md:block"><CommandInput /></div>
        <span className="hidden sm:inline font-mono text-xs text-secondary-fg" suppressHydrationWarning>{utc || "—"}</span>
        <ThemeToggle />
        <LangToggle />
        <NotificationCenter />
      </div>
    </header>
  );
}
