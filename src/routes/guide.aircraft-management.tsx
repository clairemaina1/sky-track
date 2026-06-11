import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";

export const Route = createFileRoute("/guide/aircraft-management")({
  component: GuidePage,
  head: () => ({
    ...pageHead({
      title: "Aircraft Management: The Complete Guide (2026) — SkyTrack",
      description: "A complete guide to modern aircraft management — operational efficiency, ICAO compliance, MRO, and how an Aviation Operating System (AAOS) unifies fleet tracking and maintenance.",
      path: "/guide/aircraft-management",
      ogType: "article",
    })(),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Aircraft Management: The Complete Guide (2026)",
          description: "How modern operators run fleets with an Aviation Operating System (AAOS): efficiency, compliance, MRO, and real-time tracking.",
          author: { "@type": "Organization", name: "SkyTrack AAOS" },
          publisher: { "@type": "Organization", name: "SkyTrack AAOS" },
        }),
      },
    ],
  }),
});

function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-200">
      <article className="prose prose-invert">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">SkyTrack Guide</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight text-slate-50">
          Aircraft Management: The Complete Guide (2026)
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          A practical playbook for fleet owners and operators: how to keep aircraft compliant,
          available, and economically utilised — and how a modern Aviation Operating System
          (AAOS) ties it all together.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-slate-100">What is aircraft management?</h2>
        <p className="mt-3 text-slate-300">
          Aircraft management is the discipline of operating an aircraft (or a fleet) so that
          it is airworthy, regulator-compliant, crewed, fuelled, scheduled, and profitable.
          It spans maintenance, crew, dispatch, finance, insurance, and increasingly — data.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-slate-100">Operational efficiency</h2>
        <p className="mt-3 text-slate-300">
          Every grounded hour is revenue lost and fixed cost burned. Efficient operators
          measure utilisation (block hours / available hours), turn-times, and AOG response.
          The fastest wins come from predictive maintenance, route optimisation, and crew
          pairing automation.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-slate-100">ICAO &amp; regulatory compliance</h2>
        <p className="mt-3 text-slate-300">
          ICAO Annex 6 (Operations), Annex 8 (Airworthiness), and the CORSIA emissions
          scheme set the global baseline. National authorities (FAA, EASA, KCAA) layer
          on local rules. A modern AAOS keeps the audit trail — every work order, duty
          log, and emissions record — queryable in seconds.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-slate-100">Maintenance &amp; MRO</h2>
        <p className="mt-3 text-slate-300">
          Move from calendar-based checks to condition-based maintenance. Health scores
          and Remaining Useful Life (RUL) forecasts from sensor data let you bundle
          tasks, pre-position parts, and avoid AOG events.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-slate-100">Why an Aviation Operating System (AAOS)</h2>
        <p className="mt-3 text-slate-300">
          Spreadsheets and siloed tools cost you visibility. An AAOS unifies fleet
          status, flights, MRO, crew, and disruption response on one live surface —
          with AI copilots that summarise the situation and suggest actions.
        </p>

        <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h2 className="text-xl font-semibold text-slate-50">See SkyTrack AAOS in action</h2>
          <p className="mt-2 text-sm text-slate-300">
            Real-time fleet, MRO, crew, and ICAO-grade emissions tracking in one command center.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Sign in to SkyTrack
          </Link>
        </div>
      </article>
    </main>
  );
}
