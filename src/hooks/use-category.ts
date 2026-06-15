import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgId } from "@/hooks/use-org";

export type SkytrackCategory = "flight_school" | "icao" | "airline" | "cargo";

export const CATEGORY_LABEL: Record<SkytrackCategory, string> = {
  flight_school: "SkyTrack Flight Schools",
  icao: "SkyTrack ICAO",
  airline: "SkyTrack Airlines",
  cargo: "SkyTrack Cargo",
};

export const CATEGORY_ACCENT: Record<SkytrackCategory, string> = {
  flight_school: "#FFB547",
  icao: "#3DD9FF",
  airline: "#00C2A8",
  cargo: "#A78BFA",
};

const KEY = "skytrack.category";

export function useSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      return (rows ?? []).some((r: { role: string }) => r.role === "super_admin");
    },
    staleTime: 60_000,
  });
}

export function useProvisionStatus() {
  return useQuery({
    queryKey: ["provision-status"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { provisioned: false, pending: null as null | { status: string; email: string } };
      // super admin or any org member = provisioned
      const [{ data: roles }, { data: members }, { data: pending }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("organization_members").select("org_id").eq("user_id", u.user.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("pending_users").select("status, email").eq("user_id", u.user.id).maybeSingle(),
      ]);
      const isSuper = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
      const provisioned = isSuper || (members ?? []).length > 0;
      return { provisioned, pending: pending ?? null };
    },
    staleTime: 30_000,
  });
}

export function useMyCategories(orgId: string | null) {
  return useQuery({
    queryKey: ["my-categories", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<SkytrackCategory[]> => {
      if (!orgId) return [];
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_category_access")
        .select("category")
        .eq("user_id", u.user.id)
        .eq("org_id", orgId);
      return (data ?? []).map((r: { category: SkytrackCategory }) => r.category);
    },
    staleTime: 60_000,
  });
}

export function useCurrentCategory(): [SkytrackCategory | null, (c: SkytrackCategory) => void] {
  const [orgId] = useCurrentOrgId();
  const { data: cats = [] } = useMyCategories(orgId);
  const [cat, setCat] = useState<SkytrackCategory | null>(() => {
    if (typeof window === "undefined") return null;
    return (window.localStorage.getItem(KEY) as SkytrackCategory) || null;
  });

  useEffect(() => {
    if (!cats.length) return;
    if (!cat || !cats.includes(cat)) {
      const first = cats[0];
      setCat(first);
      if (typeof window !== "undefined") window.localStorage.setItem(KEY, first);
    }
  }, [cats, cat]);

  function update(c: SkytrackCategory) {
    setCat(c);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, c);
    window.dispatchEvent(new CustomEvent("skytrack:category-change"));
  }

  return [cat, update];
}
