import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/routeHead";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-org";
import { Shield, Download, MapPin, FileText, Fingerprint } from "lucide-react";
import { toCSV } from "@/lib/csv";
import { useServerFn } from "@tanstack/react-start";
import { exportSignedAudit } from "@/lib/audit-export.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/audit")({
  head: pageHead({ title: "Audit & Compliance — SkyTrack", description: "Audit log, data residency, and DPA download.", path: "/audit" }),
  component: AuditPage,
});

type Row = { id: string; created_at: string; user_id: string | null; action: string; entity: string | null; entity_id: string | null; metadata: unknown };

function AuditPage() {
  const org = useCurrentOrg();
  const [rows, setRows] = useState<Row[]>([]);
  const [region, setRegion] = useState<string>("eu-west");
  const [signing, setSigning] = useState(false);
  const signedExport = useServerFn(exportSignedAudit);

  async function exportSignedJsonl() {
    if (!org?.org_id) return;
    setSigning(true);
    try {
      const r = await signedExport({ data: { orgId: org.org_id, limit: 10000 } });
      const blob = new Blob([r.jsonl], { type: "application/x-ndjson" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skytrack-audit-signed-${new Date().toISOString().slice(0,10)}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${r.count} events · root ${r.root_hash.slice(0,10)}…`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSigning(false);
    }
  }

  useEffect(() => {
    if (!org?.org_id) return;
    supabase.from("audit_log").select("*").eq("org_id", org.org_id).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [org?.org_id]);

  function exportCsv() {
    const csv = toCSV(rows.map((r) => ({
      time: r.created_at, actor: r.user_id ?? "", action: r.action, entity: r.entity ?? "", entity_id: r.entity_id ?? "",
      metadata: JSON.stringify(r.metadata ?? {}),
    })));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "skytrack-audit.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadDPA() {
    const text = `SKYTRACK DATA PROCESSING ADDENDUM
================================
Between: SkyTrack AAOS ("Processor")
And:     ${org?.name ?? "Customer"} ("Controller")
Effective: ${new Date().toISOString().slice(0,10)}

1. Subject matter: Processing of aviation operations data on Controller's behalf.
2. Duration: Term of the master service agreement.
3. Nature and purpose: SaaS-based fleet, crew, MRO, and flight ops management.
4. Type of personal data: Crew names, employee IDs, licenses, contact details, roster and duty times.
5. Categories of data subjects: Crew members, dispatchers, admins of Controller.
6. Sub-processors: Cloud infrastructure (Cloudflare, Supabase), authentication and messaging.
7. Data residency: ${region}.
8. Security measures: TLS 1.3 in transit, AES-256 at rest, RLS-enforced tenant isolation, SSO, audit logging.
9. Sub-processor changes: 30-day written notice.
10. Data subject rights: Processor assists Controller in fulfilling access/erasure requests within 30 days.
11. Return / deletion: All Controller data returned or destroyed within 90 days of termination.
12. Audits: Annual security audit report available upon request under NDA.

Signed on behalf of Processor:  ___________________________
Signed on behalf of Controller: ___________________________
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "skytrack-dpa.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-accent" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary-fg">Audit & Compliance</h1>
          <p className="text-secondary-fg text-sm">SOC 2 / ISO 27001 evidence surface for your security review.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="border border-border-subtle bg-panel p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary-fg"><MapPin className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Data residency</span></div>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-transparent border border-border-subtle px-3 py-2 text-sm text-primary-fg font-mono">
            <option value="eu-west">EU West · Frankfurt</option>
            <option value="us-east">US East · Virginia</option>
            <option value="af-south">Africa South · Cape Town</option>
            <option value="ap-southeast">APAC · Singapore</option>
          </select>
          <p className="text-[11px] text-secondary-fg">Selection is included in your DPA. Data migration between regions is scheduled with your success manager.</p>
        </section>

        <section className="border border-border-subtle bg-panel p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary-fg"><FileText className="w-4 h-4" /><span className="font-display uppercase text-xs tracking-widest">Documents</span></div>
          <button onClick={downloadDPA} className="inline-flex items-center gap-2 text-xs text-accent hover:underline"><Download className="w-3.5 h-3.5" />Download DPA (draft)</button>
          <p className="text-[11px] text-secondary-fg">SOC 2 Type I & ISO 27001 attestation packs available on request while certification is in progress.</p>
        </section>
      </div>

      <section className="border border-border-subtle bg-panel">
        <div className="p-3 border-b border-border-subtle flex items-center justify-between">
          <span className="font-display uppercase text-xs tracking-widest text-primary-fg">Audit log · last 200 events</span>
          <button onClick={exportCsv} className="text-xs text-accent hover:underline inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" />Export CSV</button>
        </div>
        <table className="w-full text-xs">
          <thead className="text-secondary-fg"><tr>
            <th className="text-left px-3 py-2">Time (UTC)</th>
            <th className="text-left px-3 py-2">Actor</th>
            <th className="text-left px-3 py-2">Action</th>
            <th className="text-left px-3 py-2">Entity</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-secondary-fg">No events logged yet. Actions like CSV imports, approvals, and role changes will appear here.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border-subtle">
                <td className="px-3 py-2 font-mono text-secondary-fg">{new Date(r.created_at).toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-2 font-mono text-primary-fg">{r.user_id ? r.user_id.slice(0, 8) : "system"}</td>
                <td className="px-3 py-2 font-mono text-accent">{r.action}</td>
                <td className="px-3 py-2 font-mono text-primary-fg">{r.entity ?? "—"} {r.entity_id ? `· ${r.entity_id.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
