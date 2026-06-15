import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
});

type Table = "aircraft" | "flights" | "crew" | "maintenance" | "cargo" | "pilot_logbook_entries";
const TABLES: { name: Table; label: string; titleCol: string }[] = [
  { name: "aircraft", label: "Aircraft", titleCol: "tail_number" },
  { name: "flights", label: "Flights", titleCol: "flight_number" },
  { name: "crew", label: "Crew", titleCol: "full_name" },
  { name: "maintenance", label: "Maintenance", titleCol: "work_order_number" },
  { name: "cargo", label: "Cargo", titleCol: "awb_number" },
  { name: "pilot_logbook_entries", label: "Logbook", titleCol: "departure_icao" },
];

function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Inbox className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
        <h1 className="font-display text-xl uppercase tracking-[0.18em]">Approvals</h1>
      </header>
      {TABLES.map((t) => <Section key={t.name} table={t} />)}
    </div>
  );
}

function Section({ table }: { table: { name: Table; label: string; titleCol: string } }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["pending", table.name],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from(table.name)
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const act = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(table.name)
        .update({ approval_status: status, approved_by: u.user?.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pending", table.name] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data.length) return null;

  return (
    <section>
      <h2 className="font-display text-sm uppercase tracking-[0.14em] mb-3">{table.label} <span className="text-secondary-fg">({data.length})</span></h2>
      <div className="space-y-2">
        {data.map((row: Record<string, unknown>) => (
          <div key={row.id as string} className="p-3 border flex items-center justify-between gap-3" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
            <div className="min-w-0">
              <div className="font-display text-sm truncate">{(row[table.titleCol] as string) ?? "—"}</div>
              <div className="text-[10px] font-mono text-secondary-fg">created {new Date(row.created_at as string).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => act.mutate({ id: row.id as string, status: "approved" })} className="flex items-center gap-1 px-2 py-1 text-xs border" style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => act.mutate({ id: row.id as string, status: "rejected" })} className="flex items-center gap-1 px-2 py-1 text-xs border text-red-400 border-red-400/40">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
