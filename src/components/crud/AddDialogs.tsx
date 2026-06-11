import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { useQueryClient } from "@tanstack/react-query";

export function AddCrewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    employee_id: "",
    full_name: "",
    role: "Captain",
    base_airport: "",
    status: "Off-Duty" as "On-Duty" | "Off-Duty" | "Rest" | "Training",
    certifications: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true); setErr(null);
    const { error } = await supabase.from("crew").insert({
      employee_id: form.employee_id.toUpperCase().trim(),
      full_name: form.full_name.trim(),
      role: form.role.trim(),
      base_airport: form.base_airport.toUpperCase().trim(),
      status: form.status,
      certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
      org_id: orgId,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crew"] });
    onClose();
  }

  return (
    <Modal title="Add Crew Member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID" required>
            <input required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="select-input" placeholder="EMP-001" />
          </Field>
          <Field label="Role" required>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="select-input">
              {["Captain", "First Officer", "Flight Engineer", "Cabin Crew", "Instructor", "Student Pilot"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Full name" required>
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="select-input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base airport (ICAO)" required>
            <input required maxLength={4} value={form.base_airport} onChange={(e) => setForm({ ...form, base_airport: e.target.value })} className="select-input" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="select-input">
              {["Off-Duty", "On-Duty", "Rest", "Training"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Certifications (comma-separated)">
          <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} className="select-input" placeholder="A320, B737, ATPL" />
        </Field>
        {err && <div className="text-xs text-red-400">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-cmd-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-cmd">{saving ? "Saving…" : "Add crew"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function AddCargoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    awb_number: "",
    shipper: "",
    consignee: "",
    origin_icao: "",
    destination_icao: "",
    weight_kg: 0,
    commodity_type: "",
    status: "Loaded" as "Loaded" | "In-Transit" | "Delivered" | "Delayed" | "Damaged",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true); setErr(null);
    const { error } = await supabase.from("cargo").insert({
      awb_number: form.awb_number.toUpperCase().trim(),
      shipper: form.shipper.trim(),
      consignee: form.consignee.trim(),
      origin_icao: form.origin_icao.toUpperCase().trim(),
      destination_icao: form.destination_icao.toUpperCase().trim(),
      weight_kg: form.weight_kg,
      commodity_type: form.commodity_type.trim() || null,
      status: form.status,
      org_id: orgId,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    qc.invalidateQueries({ queryKey: ["cargo"] });
    onClose();
  }

  return (
    <Modal title="Add Cargo Shipment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="AWB number" required>
            <input required value={form.awb_number} onChange={(e) => setForm({ ...form, awb_number: e.target.value })} className="select-input" placeholder="123-45678901" />
          </Field>
          <Field label="Weight (kg)" required>
            <input required type="number" min={0} value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })} className="select-input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shipper" required>
            <input required value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} className="select-input" />
          </Field>
          <Field label="Consignee" required>
            <input required value={form.consignee} onChange={(e) => setForm({ ...form, consignee: e.target.value })} className="select-input" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Origin (ICAO)" required>
            <input required maxLength={4} value={form.origin_icao} onChange={(e) => setForm({ ...form, origin_icao: e.target.value })} className="select-input" />
          </Field>
          <Field label="Dest (ICAO)" required>
            <input required maxLength={4} value={form.destination_icao} onChange={(e) => setForm({ ...form, destination_icao: e.target.value })} className="select-input" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="select-input">
              {["Loaded", "In-Transit", "Delivered", "Delayed", "Damaged"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Commodity type">
          <input value={form.commodity_type} onChange={(e) => setForm({ ...form, commodity_type: e.target.value })} className="select-input" placeholder="General, Perishable, Hazmat…" />
        </Field>
        {err && <div className="text-xs text-red-400">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-cmd-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-cmd">{saving ? "Saving…" : "Add shipment"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-panel" style={{ borderColor: "var(--border-active)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="font-display uppercase tracking-[0.12em] text-sm text-primary-fg">{title}</h2>
          <button onClick={onClose} className="text-secondary-fg hover:text-primary-fg" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
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
