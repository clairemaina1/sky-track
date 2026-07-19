import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_TABLES = [
  "crew_assignments",
  "crew_credentials",
  "maintenance",
  "alerts",
  "pilot_logbook_entries",
  "marketplace_listings",
  "notifications",
  "cargo",
  "flights",
  "crew",
  "aircraft",
];

/** Wipe all operational data for a target org. Super-admin only. Preserves the org itself + members. */
export const resetDemoOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgName?: string; orgId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("is_super_admin", { _uid: context.userId });
    if (!isSuper) throw new Error("Forbidden — super_admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let orgId = data.orgId ?? null;
    if (!orgId) {
      const name = data.orgName ?? "SkyTrack Demo";
      const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("name", name).maybeSingle();
      if (!org) throw new Error(`Org "${name}" not found`);
      orgId = org.id;
    }

    const summary: Record<string, number> = {};
    for (const table of DEMO_TABLES) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq("org_id", orgId);
      if (error) throw new Error(`${table}: ${error.message}`);
      summary[table] = count ?? 0;
    }

    await supabaseAdmin.from("audit_log").insert({
      org_id: orgId,
      user_id: context.userId,
      action: "demo_reset",
      entity: "organization",
      entity_id: orgId,
      metadata: summary,
    });

    return { ok: true, org_id: orgId, deleted: summary };
  });
