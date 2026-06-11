import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAlertStore } from "@/stores/alertStore";

type FieldKind = "text" | "number" | "select";

interface Props {
  table: "cargo" | "aircraft" | "crew";
  rowId: string;
  field: string;
  value: string | number | null;
  kind?: FieldKind;
  options?: readonly string[];
  /** Cache keys to invalidate after save. Defaults to the table name root. */
  invalidate?: readonly string[];
  display?: (value: string | number | null) => React.ReactNode;
  className?: string;
}

/**
 * Inline editable cell. Double-click to edit, Enter to save, Esc to cancel.
 * Optimistic — the underlying useQuery refetches after invalidation.
 */
export function EditableCell({
  table,
  rowId,
  field,
  value,
  kind = "text",
  options,
  invalidate,
  display,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const qc = useQueryClient();
  const pushToast = useAlertStore((s) => s.pushToast);

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current && typeof (inputRef.current as HTMLInputElement).select === "function") {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [editing]);

  const m = useMutation({
    mutationFn: async (next: string | number | null) => {
      const patch: Record<string, unknown> = { [field]: next };
      const { error } = await supabase.from(table).update(patch).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      const keys = invalidate ?? [table];
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (err: Error) => {
      pushToast({
        id: crypto.randomUUID(),
        severity: "warning",
        type: "EDIT_FAILED",
        title: `Couldn't save ${field}`,
        body: err.message,
        source_id: rowId,
        source_table: table,
        acknowledged: false,
        created_at: new Date().toISOString(),
        acknowledged_by: null,
      });
      setDraft(value == null ? "" : String(value));
    },
  });

  function commit() {
    setEditing(false);
    const raw = draft.trim();
    if (raw === String(value ?? "")) return;
    if (kind === "number") {
      const n = raw === "" ? null : Number(raw);
      if (n != null && Number.isNaN(n)) return;
      m.mutate(n);
    } else {
      m.mutate(raw === "" ? null : raw);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={() => setEditing(true)}
        title="Double-click to edit"
        className={`w-full cursor-text text-left rounded px-1 py-0.5 transition-colors hover:bg-white/5 ${className ?? ""}`}
      >
        {display ? display(value) : value == null || value === "" ? <span className="text-slate-600">—</span> : String(value)}
      </button>
    );
  }

  if (kind === "select" && options) {
    return (
      <select
        ref={(el) => (inputRef.current = el)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value == null ? "" : String(value));
            setEditing(false);
          }
        }}
        className="w-full rounded border bg-slate-950 px-1 py-0.5 text-xs text-slate-100 outline-none"
        style={{ borderColor: "var(--accent-primary)" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={(el) => (inputRef.current = el)}
      type={kind === "number" ? "number" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value == null ? "" : String(value));
          setEditing(false);
        }
      }}
      className="w-full rounded border bg-slate-950 px-1 py-0.5 text-xs text-slate-100 outline-none"
      style={{ borderColor: "var(--accent-primary)" }}
    />
  );
}
