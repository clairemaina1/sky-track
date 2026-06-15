import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/logbook")({
  component: LogbookPage,
});

interface Entry {
  id: string;
  flight_date: string;
  departure_icao: string | null;
  arrival_icao: string | null;
  total_time_min: number;
  pic_time_min: number;
  night_time_min: number;
  ifr_time_min: number;
  landings_day: number;
  landings_night: number;
  remarks: string | null;
  approval_status: string;
}

function fmtHrs(min: number) {
  return (min / 60).toFixed(1) + "h";
}

function LogbookPage() {
  const [orgId] = useCurrentOrgId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["logbook", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Entry[]> => {
      const { data: u } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("pilot_logbook_entries")
        .select("*")
        .eq("pilot_user_id", u.user?.id)
        .order("flight_date", { ascending: false });
      return data ?? [];
    },
  });

  const totals = entries.reduce(
    (a, e) => ({
      total: a.total + e.total_time_min,
      pic: a.pic + e.pic_time_min,
      night: a.night + e.night_time_min,
      ifr: a.ifr + e.ifr_time_min,
      landings: a.landings + e.landings_day + e.landings_night,
    }),
    { total: 0, pic: 0, night: 0, ifr: 0, landings: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5" style={{ color: "var(--accent-gold, #FFB547)" }} />
          <div>
            <h1 className="font-display text-xl uppercase tracking-[0.18em]">Pilot Logbook</h1>
            <p className="text-xs text-secondary-fg font-mono uppercase tracking-[0.14em]">Digital flight time record</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-display uppercase tracking-[0.14em] border" style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}>
          <Plus className="w-3.5 h-3.5" /> New Entry
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Totals label="Total" value={fmtHrs(totals.total)} />
        <Totals label="PIC" value={fmtHrs(totals.pic)} />
        <Totals label="Night" value={fmtHrs(totals.night)} />
        <Totals label="IFR" value={fmtHrs(totals.ifr)} />
        <Totals label="Landings" value={String(totals.landings)} />
      </div>

      <div className="border" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
        <table className="w-full text-xs">
          <thead className="text-secondary-fg font-mono uppercase tracking-[0.12em]">
            <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Route</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">PIC</th>
              <th className="text-right p-2">Night</th>
              <th className="text-right p-2">IFR</th>
              <th className="text-right p-2">Ldgs</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-secondary-fg">No logbook entries yet.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <td className="p-2 font-mono">{e.flight_date}</td>
                <td className="p-2">{e.departure_icao ?? "—"} → {e.arrival_icao ?? "—"}</td>
                <td className="p-2 text-right font-mono">{fmtHrs(e.total_time_min)}</td>
                <td className="p-2 text-right font-mono">{fmtHrs(e.pic_time_min)}</td>
                <td className="p-2 text-right font-mono">{fmtHrs(e.night_time_min)}</td>
                <td className="p-2 text-right font-mono">{fmtHrs(e.ifr_time_min)}</td>
                <td className="p-2 text-right font-mono">{e.landings_day + e.landings_night}</td>
                <td className="p-2">
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.14em] border ${
                    e.approval_status === "approved" ? "text-emerald-300 border-emerald-400/40" :
                    e.approval_status === "rejected" ? "text-red-300 border-red-400/40" :
                    "text-amber-300 border-amber-400/40"
                  }`}>{e.approval_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && orgId && <NewEntryDialog orgId={orgId} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["logbook"] })} />}
    </div>
  );
}

function Totals({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border" style={{ borderColor: "var(--border-subtle)", borderRadius: 3, background: "var(--bg-panel)" }}>
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-secondary-fg">{label}</div>
      <div className="font-display text-xl mt-1">{value}</div>
    </div>
  );
}

function NewEntryDialog({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    flight_date: new Date().toISOString().slice(0, 10),
    departure_icao: "",
    arrival_icao: "",
    total_time_min: 0,
    pic_time_min: 0,
    night_time_min: 0,
    ifr_time_min: 0,
    landings_day: 1,
    landings_night: 0,
    remarks: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("pilot_logbook_entries").insert({
        org_id: orgId,
        pilot_user_id: u.user.id,
        created_by: u.user.id,
        ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Logbook entry saved · pending sign-off"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-panel border p-5 w-full max-w-lg space-y-3" style={{ borderColor: "var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display uppercase tracking-[0.16em] text-sm">New Logbook Entry</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Date" type="date" value={form.flight_date} onChange={(v) => setForm({ ...form, flight_date: v })} />
          <div />
          <Field label="From (ICAO)" value={form.departure_icao} onChange={(v) => setForm({ ...form, departure_icao: v.toUpperCase() })} />
          <Field label="To (ICAO)" value={form.arrival_icao} onChange={(v) => setForm({ ...form, arrival_icao: v.toUpperCase() })} />
          <Field label="Total (min)" type="number" value={String(form.total_time_min)} onChange={(v) => setForm({ ...form, total_time_min: Number(v) })} />
          <Field label="PIC (min)" type="number" value={String(form.pic_time_min)} onChange={(v) => setForm({ ...form, pic_time_min: Number(v) })} />
          <Field label="Night (min)" type="number" value={String(form.night_time_min)} onChange={(v) => setForm({ ...form, night_time_min: Number(v) })} />
          <Field label="IFR (min)" type="number" value={String(form.ifr_time_min)} onChange={(v) => setForm({ ...form, ifr_time_min: Number(v) })} />
          <Field label="Day ldgs" type="number" value={String(form.landings_day)} onChange={(v) => setForm({ ...form, landings_day: Number(v) })} />
          <Field label="Night ldgs" type="number" value={String(form.landings_night)} onChange={(v) => setForm({ ...form, landings_night: Number(v) })} />
        </div>
        <Field label="Remarks" value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} />
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs uppercase tracking-[0.14em]">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="px-3 py-1.5 text-xs font-display uppercase tracking-[0.14em] border" style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-secondary-fg">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent border px-2 py-1 text-xs" style={{ borderColor: "var(--border-subtle)" }} />
    </label>
  );
}
