import { useState } from "react";
import { Bookmark, Trash2, Plus, Check } from "lucide-react";
import { useSavedViews, type SavedView } from "@/hooks/use-saved-views";

interface Props<T> {
  scope: string;
  current: T;
  onApply: (payload: T) => void;
  /** Returns a short human label describing `current` for the save button hint. */
  describe?: (payload: T) => string;
}

export function SavedViewsMenu<T>({ scope, current, onApply, describe }: Props<T>) {
  const { views, save, remove } = useSavedViews<T>(scope);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-transparent px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
        title="Saved views"
      >
        <Bookmark className="h-3 w-3" />
        Views
        {views.length > 0 && (
          <span className="rounded bg-slate-800 px-1 text-[9px] font-semibold text-slate-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {views.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-[110%] z-40 w-72 rounded-xl border p-2 shadow-2xl"
            style={{ background: "rgba(8,15,30,0.98)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
          >
            <div className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Saved Views
            </div>
            {views.length === 0 ? (
              <div className="px-2 py-3 text-[11px] text-slate-500">No saved views yet.</div>
            ) : (
              <ul className="max-h-60 overflow-auto">
                {views.map((v: SavedView<T>) => (
                  <li key={v.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        onApply(v.payload);
                        setOpen(false);
                      }}
                      className="flex flex-1 items-center gap-2 truncate text-left text-[12px] text-slate-200"
                    >
                      <Check className="h-3 w-3 text-emerald-400 opacity-70" />
                      <span className="truncate">{v.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(v.id)}
                      className="opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      aria-label={`Delete view ${v.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="px-1 text-[9px] uppercase tracking-[0.12em] text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Save current
              </div>
              {describe && (
                <div className="px-1 py-0.5 text-[10px] text-slate-500">{describe(current)}</div>
              )}
              <form
                className="mt-1 flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  save(name, current);
                  setName("");
                }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="View name…"
                  className="flex-1 rounded border bg-transparent px-2 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded border px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                  style={{ borderColor: "rgba(52,211,153,0.25)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Plus className="h-3 w-3" /> Save
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
