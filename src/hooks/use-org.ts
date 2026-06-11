import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "skytrack.org_id";

export interface OrgMembership {
  org_id: string;
  role: string;
  name: string;
  tier: "commercial" | "flight_school";
}

export function useMyOrgs() {
  return useQuery({
    queryKey: ["my-orgs"],
    queryFn: async (): Promise<OrgMembership[]> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, org_id, organizations!inner(id, name, tier)");
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => ({
        org_id: row.org_id,
        role: row.role,
        name: row.organizations.name,
        tier: row.organizations.tier,
      }));
    },
    staleTime: 60_000,
  });
}

export function useCurrentOrgId(): [string | null, (id: string) => void] {
  const { data: orgs } = useMyOrgs();
  const [orgId, setOrgIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  // Default to first available org once memberships load
  useEffect(() => {
    if (!orgs || orgs.length === 0) return;
    if (!orgId || !orgs.some((o) => o.org_id === orgId)) {
      const first = orgs[0].org_id;
      setOrgIdState(first);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, first);
    }
  }, [orgs, orgId]);

  function setOrgId(id: string) {
    setOrgIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
    // Force a refetch on every data query so views update
    window.dispatchEvent(new CustomEvent("skytrack:org-change"));
  }

  return [orgId, setOrgId];
}

export function useCurrentOrg(): OrgMembership | null {
  const { data: orgs } = useMyOrgs();
  const [orgId] = useCurrentOrgId();
  if (!orgs || !orgId) return null;
  return orgs.find((o) => o.org_id === orgId) ?? null;
}
