import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { Code2, Download, Key, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/docs/api")({
  head: pageHead({ title: "SkyTrack Public API — Docs", description: "OpenAPI spec, examples, and auth guide for piping your ERP into SkyTrack.", path: "/docs/api" }),
  component: ApiDocs,
});

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "SkyTrack Public API",
    version: "1.0.0",
    description: "Read and write to your SkyTrack tenant. Bearer auth with an org-scoped API token.",
  },
  servers: [{ url: "https://skytrackk.lovable.app/api/public/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    schemas: {
      Aircraft: {
        type: "object",
        properties: {
          tail_number: { type: "string" },
          model: { type: "string" },
          base_airport: { type: "string" },
          status: { type: "string" },
          icao24_hex: { type: "string", nullable: true },
        },
      },
      Flight: {
        type: "object",
        properties: {
          flight_number: { type: "string" },
          origin_icao: { type: "string" },
          destination_icao: { type: "string" },
          scheduled_departure: { type: "string", format: "date-time" },
          scheduled_arrival: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/aircraft": {
      get: { summary: "List aircraft in your org", responses: { "200": { description: "OK" } } },
      post: { summary: "Create aircraft", responses: { "201": { description: "Created" } } },
    },
    "/flights": {
      get: { summary: "List flights", responses: { "200": { description: "OK" } } },
      post: { summary: "Schedule a flight", responses: { "201": { description: "Created" } } },
    },
    "/crew": { get: { summary: "List crew", responses: { "200": { description: "OK" } } } },
  },
} as const;

function ApiDocs() {
  function downloadSpec() {
    const blob = new Blob([JSON.stringify(SPEC, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "skytrack-openapi.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-void text-primary-fg">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <header>
          <h1 className="font-display text-3xl uppercase tracking-widest text-primary-fg">Public API</h1>
          <p className="text-secondary-fg mt-2">Wire your ERP, roster software, or maintenance system to SkyTrack in one afternoon.</p>
        </header>

        <div className="flex gap-3">
          <button onClick={downloadSpec} className="btn-cmd inline-flex items-center gap-2"><Download className="w-4 h-4" />openapi.json</button>
          <a href="https://petstore.swagger.io/?url=https://skytrackk.lovable.app/api/public/v1/openapi.json" target="_blank" rel="noreferrer"
            className="btn-cmd inline-flex items-center gap-2"><ExternalLink className="w-4 h-4" />Open in Swagger</a>
        </div>

        <section className="border border-border-subtle bg-panel p-5 space-y-3">
          <div className="flex items-center gap-2"><Key className="w-4 h-4 text-accent" /><span className="font-display uppercase text-xs tracking-widest">Authentication</span></div>
          <p className="text-sm text-secondary-fg">Every request needs a bearer token issued in <span className="font-mono text-accent">Settings → Integrations</span>. Tokens are scoped to a single organization and inherit RLS.</p>
          <pre className="bg-void border border-border-subtle p-3 text-xs font-mono overflow-x-auto">Authorization: Bearer sk_live_...</pre>
        </section>

        <section className="border border-border-subtle bg-panel p-5 space-y-3">
          <div className="flex items-center gap-2"><Code2 className="w-4 h-4 text-accent" /><span className="font-display uppercase text-xs tracking-widest">Quick start · list aircraft</span></div>
          <pre className="bg-void border border-border-subtle p-3 text-xs font-mono overflow-x-auto">{`curl https://skytrackk.lovable.app/api/public/v1/aircraft \\
  -H "Authorization: Bearer $SKYTRACK_TOKEN"`}</pre>
        </section>

        <section className="border border-border-subtle bg-panel p-5 space-y-3">
          <div className="font-display uppercase text-xs tracking-widest">Endpoints</div>
          <ul className="text-sm font-mono space-y-1">
            <li><span className="text-emerald-400">GET</span> /api/public/v1/aircraft</li>
            <li><span className="text-sky-400">POST</span> /api/public/v1/aircraft</li>
            <li><span className="text-emerald-400">GET</span> /api/public/v1/flights</li>
            <li><span className="text-sky-400">POST</span> /api/public/v1/flights</li>
            <li><span className="text-emerald-400">GET</span> /api/public/v1/crew</li>
            <li><span className="text-emerald-400">GET</span> /api/public/v1/openapi.json</li>
          </ul>
        </section>

        <p className="text-[11px] text-secondary-fg">Rate limit: 120 req/min per token. All responses are JSON. Timestamps are ISO-8601 UTC.</p>
      </div>
    </div>
  );
}
