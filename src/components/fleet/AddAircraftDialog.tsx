import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { useQueryClient } from "@tanstack/react-query";

export function AddAircraftDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    tail_number: "",
    model: "",
    airline: "",
    base_airport: "",
    status: "On-Ground" as "On-Ground" | "In-Flight" | "Maintenance" | "AOG" | "Standby",
    health_score: 100,
    flight_hours_total: 0,
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("aircraft").insert({
      ...form,
      tail_number: form.tail_number.toUpperCase().trim(),
      base_airport: form.base_airport.toUpperCase().trim(),
      org_id: orgId,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["aircraft"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-panel" style={{ borderColor: "var(--border-active)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="font-display uppercase tracking-[0.12em] text-sm text-primary-fg">Add Aircraft</h2>
          <button onClick={onClose} className="text-secondary-fg hover:text-primary-fg" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <Field label="Tail number" required>
            <input required value={form.tail_number} onChange={(e) => setForm({ ...form, tail_number: e.target.value })} className="select-input" placeholder="N123AB" />
          </Field>
          <Field label="Model" required>
            <input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="select-input" placeholder="A320-200" />
          </Field>
          <Field label="Operator / airline" required>
            <input required value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} className="select-input" placeholder="SkyTrack Airways" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base airport (ICAO)" required>
              <input required maxLength={4} value={form.base_airport} onChange={(e) => setForm({ ...form, base_airport: e.target.value })} className="select-input" placeholder="HKJK" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="select-input">
                {["On-Ground", "Standby", "In-Flight", "Maintenance", "AOG"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Health score">
              <input type="number" min={0} max={100} value={form.health_score} onChange={(e) => setForm({ ...form, health_score: Number(e.target.value) })} className="select-input" />
            </Field>
            <Field label="Total flight hours">
              <input type="number" min={0} value={form.flight_hours_total} onChange={(e) => setForm({ ...form, flight_hours_total: Number(e.target.value) })} className="select-input" />
            </Field>
          </div>
          {err && <div className="text-xs text-red-400">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-cmd-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-cmd">{saving ? "Saving…" : "Add aircraft"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="font-mono uppercase tracking-wider text-[10px] text-secondary-fg mb-1">
        {label}{required && <span className="text-red-400">*</span>}
      </div>
      {children}
    </label>
  );
}
