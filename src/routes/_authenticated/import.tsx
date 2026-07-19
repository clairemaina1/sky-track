import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { parseCSV, toCSV } from "@/lib/csv";
import { Upload, CheckCircle2, AlertTriangle, Download, Plane, Users, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/import")({
  head: pageHead({ title: "CSV Importer — SkyTrack", description: "Bulk-import your fleet, crew and flights.", path: "/import" }),
  component: ImportPage,
});

type Kind = "aircraft" | "crew" | "flights";

const TEMPLATES: Record<Kind, { headers: string[]; sample: Record<string, string>[] }> = {
  aircraft: {
    headers: ["tail_number", "model", "airline", "base_airport", "status", "icao24_hex"],
    sample: [
      { tail_number: "5Y-ABC", model: "B737-800", airline: "Skyward", base_airport: "HKJK", status: "Available", icao24_hex: "04001A" },
      { tail_number: "5Y-XYZ", model: "DHC-8-400", airline: "Skyward", base_airport: "HKJK", status: "Available", icao24_hex: "" },
    ],
  },
  crew: {
    headers: ["employee_id", "full_name", "role", "base_airport", "certifications"],
    sample: [
      { employee_id: "P001", full_name: "Amina Yusuf", role: "Captain", base_airport: "HKJK", certifications: "ATPL;B737" },
      { employee_id: "C042", full_name: "David Otieno", role: "Cabin", base_airport: "HKJK", certifications: "SEP" },
    ],
  },
  flights: {
    headers: ["flight_number", "origin_icao", "destination_icao", "scheduled_departure", "scheduled_arrival", "aircraft_tail"],
    sample: [
      { flight_number: "SW101", origin_icao: "HKJK", destination_icao: "HKMO", scheduled_departure: "2026-07-20T06:30:00Z", scheduled_arrival: "2026-07-20T07:45:00Z", aircraft_tail: "5Y-ABC" },
    ],
  },
};

function ImportPage() {
  const currentOrg = useCurrentOrg();
  const [kind, setKind] = useState<Kind>("aircraft");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);

  const template = TEMPLATES[kind];

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  async function handleFile(f: File) {
    const text = await f.text();
    setRows(parseCSV(text));
    setResult(null);
  }

  function downloadTemplate() {
    const csv = toCSV(template.sample, template.headers);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${kind}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function commit() {
    if (!currentOrg?.org_id) { setResult({ ok: 0, failed: rows.length, errors: ["No active org"] }); return; }
    setBusy(true);
    const errors: string[] = [];
    let ok = 0, failed = 0;

    if (kind === "aircraft") {
      const payload = rows.map((r) => ({
        tail_number: r.tail_number,
        model: r.model,
        airline: r.airline || currentOrg.name,
        base_airport: r.base_airport,
        status: (r.status || "Available") as never,
        icao24_hex: r.icao24_hex || null,
        org_id: currentOrg.org_id,
      })).filter((r) => r.tail_number && r.model && r.base_airport);
      const { error, count } = await supabase.from("aircraft").insert(payload, { count: "exact" });
      if (error) { failed = payload.length; errors.push(error.message); } else { ok = count ?? payload.length; }
    } else if (kind === "crew") {
      const payload = rows.map((r) => ({
        employee_id: r.employee_id,
        full_name: r.full_name,
        role: r.role || "Captain",
        base_airport: r.base_airport,
        certifications: (r.certifications || "").split(/[;,]/).map((s) => s.trim()).filter(Boolean),
        org_id: currentOrg.org_id,
      })).filter((r) => r.employee_id && r.full_name && r.base_airport);
      const { error, count } = await supabase.from("crew").insert(payload, { count: "exact" });
      if (error) { failed = payload.length; errors.push(error.message); } else { ok = count ?? payload.length; }
    } else {
      // flights: resolve aircraft_tail → aircraft_id
      const tails = Array.from(new Set(rows.map((r) => r.aircraft_tail).filter(Boolean)));
      const { data: acs } = await supabase.from("aircraft").select("id, tail_number").in("tail_number", tails);
      const map = new Map((acs ?? []).map((a) => [a.tail_number, a.id]));
      const payload = rows.map((r) => ({
        flight_number: r.flight_number,
        origin_icao: r.origin_icao,
        destination_icao: r.destination_icao,
        scheduled_departure: r.scheduled_departure,
        scheduled_arrival: r.scheduled_arrival,
        aircraft_id: r.aircraft_tail ? map.get(r.aircraft_tail) ?? null : null,
        org_id: currentOrg.org_id,
      })).filter((r) => r.flight_number && r.origin_icao && r.destination_icao);
      const { error, count } = await supabase.from("flights").insert(payload, { count: "exact" });
      if (error) { failed = payload.length; errors.push(error.message); } else { ok = count ?? payload.length; }
    }
    setBusy(false);
    setResult({ ok, failed, errors });
    if (ok > 0) {
      await supabase.from("audit_log").insert({
        org_id: currentOrg.org_id,
        user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        action: `import.${kind}`,
        entity: kind,
        metadata: { rows: ok },
      });
    }
  }

  const KindIcon = kind === "aircraft" ? Plane : kind === "crew" ? Users : CalendarDays;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">CSV Importer</h1>
        <p className="text-secondary-fg text-sm mt-1">Get from spreadsheet to live ops in minutes. Pick a type, download the template, upload, review, commit.</p>
      </header>

      <div className="flex gap-2">
        {(["aircraft", "crew", "flights"] as Kind[]).map((k) => (
          <button key={k} onClick={() => { setKind(k); setRows([]); setResult(null); }}
            className={`px-3 py-1.5 border font-display uppercase text-[11px] tracking-widest ${kind === k ? "bg-accent/10 text-accent border-accent" : "border-border-subtle text-secondary-fg"}`}>
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="border border-border-subtle p-4 bg-panel space-y-3">
          <div className="flex items-center gap-2 text-primary-fg"><KindIcon className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Step 1 · Template</span></div>
          <p className="text-xs text-secondary-fg">Required columns: <span className="font-mono">{template.headers.join(", ")}</span></p>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-xs text-accent hover:underline">
            <Download className="w-3.5 h-3.5" /> Download {kind}-template.csv
          </button>
        </section>

        <section className="border border-border-subtle p-4 bg-panel space-y-3">
          <div className="flex items-center gap-2 text-primary-fg"><Upload className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Step 2 · Upload</span></div>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-xs text-secondary-fg file:mr-3 file:py-1.5 file:px-3 file:border file:border-accent file:bg-transparent file:text-accent file:font-display file:uppercase file:tracking-widest file:text-[10px]" />
          {rows.length > 0 && <p className="text-xs text-secondary-fg">{rows.length} rows parsed.</p>}
        </section>
      </div>

      {rows.length > 0 && (
        <section className="border border-border-subtle bg-panel">
          <div className="p-3 border-b border-border-subtle font-display uppercase text-xs tracking-widest text-primary-fg">Preview (first 8 of {rows.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-secondary-fg">
                <tr>{template.headers.map((h) => <th key={h} className="text-left px-3 py-2 font-mono">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    {template.headers.map((h) => <td key={h} className="px-3 py-2 text-primary-fg font-mono">{r[h] || <span className="text-secondary-fg">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border-subtle flex items-center justify-between">
            <span className="text-xs text-secondary-fg">Commit inserts to your org. This action is logged.</span>
            <button onClick={commit} disabled={busy} className="btn-cmd">{busy ? "Importing…" : `Commit ${rows.length} rows`}</button>
          </div>
        </section>
      )}

      {result && (
        <div className={`border p-3 ${result.failed ? "border-amber-400/40" : "border-emerald-400/40"}`}>
          <div className="flex items-center gap-2 text-sm">
            {result.failed ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span className="text-primary-fg font-display uppercase tracking-widest text-xs">
              Imported {result.ok} · Failed {result.failed}
            </span>
          </div>
          {result.errors.length > 0 && <pre className="mt-2 text-[11px] text-amber-300 whitespace-pre-wrap">{result.errors.join("\n")}</pre>}
        </div>
      )}
    </div>
  );
}
