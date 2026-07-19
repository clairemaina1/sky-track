import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, CheckCircle2, FileCheck, Globe, Users } from "lucide-react";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/trust")({
  head: pageHead({
    title: "Trust & Compliance — SkyTrack AAOS",
    description:
      "How SkyTrack keeps your operations data secure. Certifications, data residency, and named launch partners in African aviation.",
    path: "/trust",
  }),
  component: TrustPage,
});

type Cert = { name: string; status: "certified" | "in_progress" | "aligned"; detail: string };
const CERTS: Cert[] = [
  { name: "ISO/IEC 27001", status: "in_progress", detail: "Information security management. Stage 1 audit scheduled Q3 2026." },
  { name: "SOC 2 Type I", status: "in_progress", detail: "Trust services criteria — security & availability. Readiness assessment underway." },
  { name: "KCAA Aviation Data Handling", status: "aligned", detail: "Aligned with Kenya Civil Aviation Authority record-keeping requirements for operators." },
  { name: "GDPR", status: "aligned", detail: "EU personal data handling. DPA available on request." },
  { name: "EASA Part-ORO Records", status: "aligned", detail: "Operator record retention structured to EASA Part-ORO.GEN.220." },
  { name: "TLS 1.3 + AES-256", status: "certified", detail: "All data in transit and at rest encrypted with modern ciphers." },
];

// SWAP THESE — placeholder launch partners.
type Partner = { name: string; category: string; blurb: string; logoLetter: string; color: string };
const PARTNERS: Partner[] = [
  {
    name: "Skyward Aviation Ltd",
    category: "Regional carrier — Nairobi hub",
    blurb: "Fleet of 12 aircraft; uses SkyTrack for crew allocation, MRO scheduling, and CORSIA carbon reporting.",
    logoLetter: "S",
    color: "#38bdf8",
  },
  {
    name: "Astral Flight Academy",
    category: "Flight school — Wilson Airport",
    blurb: "Runs digital pilot logbooks and student progress dashboards for 60+ trainees on SkyTrack.",
    logoLetter: "A",
    color: "#fbbf24",
  },
];

function StatusPill({ status }: { status: Cert["status"] }) {
  const map: Record<Cert["status"], { label: string; bg: string; fg: string }> = {
    certified: { label: "Certified", bg: "rgba(34,197,94,0.12)", fg: "#4ade80" },
    aligned: { label: "Aligned", bg: "rgba(56,189,248,0.12)", fg: "#38bdf8" },
    in_progress: { label: "In progress", bg: "rgba(251,191,36,0.12)", fg: "#fbbf24" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.fg}33` }}
    >
      {s.label}
    </span>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "SkyTrack AAOS",
            url: "https://skytrackk.lovable.app/trust",
            description: "Airline & aviation operations software with security, compliance, and named launch partners in Africa.",
          }),
        }}
      />

      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="font-display text-lg tracking-tight">SkyTrack</span>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Trust</span>
          </Link>
          <Link to="/login" className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <section className="mb-16">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Security posture
          </div>
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Built for the way<br />aviation actually works.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-400">
            SkyTrack handles crew rosters, maintenance logs, and passenger manifests — data your regulator asks about.
            Here's how we keep it safe, who audits us, and who trusts us with their fleet.
          </p>
        </section>

        {/* Certifications */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-slate-400" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Certifications & standards</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {CERTS.map((c) => (
              <div
                key={c.name}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-100">{c.name}</h3>
                  <StatusPill status={c.status} />
                </div>
                <p className="text-xs text-slate-400">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Named launch partners */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Launch partners</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PARTNERS.map((p) => (
              <div key={p.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg font-display text-lg font-bold"
                    style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}
                  >
                    {p.logoLetter}
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.category}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{p.blurb}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Named partners are pilot customers. Detailed case studies published quarterly.
          </p>
        </section>

        {/* Security controls */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">How your data is protected</h2>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {[
              "Row-level security enforced at the database — every read/write scoped by organization.",
              "OAuth 2.0 sign-in; MFA supported via Google, Apple, Microsoft.",
              "Automatic daily backups with point-in-time recovery.",
              "Least-privilege service-role access — audited via database migration log.",
              "All secrets stored in encrypted vault; never in application code.",
              "Regular third-party dependency scans; findings triaged weekly.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Data residency */}
        <section className="mb-16 rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <div className="flex items-start gap-4">
            <Globe className="mt-1 h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="mb-1 font-medium text-slate-100">Data residency</h3>
              <p className="text-sm text-slate-400">
                Operational data is stored in EU (Frankfurt) region by default. Enterprise customers can request
                US or Africa (Cape Town) residency at contract time.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 pt-6 text-xs text-slate-500">
          Security questions? <a href="mailto:security@skytrack.aero" className="text-emerald-400 hover:underline">security@skytrack.aero</a>
        </footer>
      </main>
    </div>
  );
}
