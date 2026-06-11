import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-user, per-page saved views (filters, search, sort, etc.) persisted to
 * localStorage scoped by the current Supabase user id. Stays client-only so
 * we don't need a new DB table.
 */
export interface SavedView<T> {
  id: string;
  name: string;
  payload: T;
  created_at: string;
}

function useUserId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? "anon"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id ?? "anon");
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

export function useSavedViews<T>(scope: string) {
  const uid = useUserId();
  const key = uid ? `skytrack.views.${uid}.${scope}` : null;
  const [views, setViews] = useState<SavedView<T>[]>([]);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      setViews(raw ? (JSON.parse(raw) as SavedView<T>[]) : []);
    } catch {
      setViews([]);
    }
  }, [key]);

  const persist = useCallback(
    (next: SavedView<T>[]) => {
      setViews(next);
      if (key) window.localStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );

  const save = useCallback(
    (name: string, payload: T) => {
      const v: SavedView<T> = {
        id: crypto.randomUUID(),
        name: name.trim().slice(0, 60) || "Untitled",
        payload,
        created_at: new Date().toISOString(),
      };
      persist([v, ...views].slice(0, 20));
      return v;
    },
    [views, persist],
  );

  const remove = useCallback(
    (id: string) => persist(views.filter((v) => v.id !== id)),
    [views, persist],
  );

  return { views, save, remove, ready: !!key };
}
