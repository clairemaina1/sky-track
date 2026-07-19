import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function client(token: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const listAircraftTool = defineTool({
  name: "list_aircraft",
  title: "List aircraft",
  description: "List aircraft in your SkyTrack organization. RLS scopes the result to what you can see.",
  inputSchema: {
    status: z.enum(["active", "AOG", "maintenance", "grounded"]).optional().describe("Optional status filter."),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = client(ctx.getToken()!).from("aircraft").select("id, tail_number, model, manufacturer, status, base_station, utilization_pct").limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { aircraft: data } };
  },
});

export const getAircraftTool = defineTool({
  name: "get_aircraft",
  title: "Get aircraft by tail number",
  description: "Fetch a single aircraft by its tail number (e.g. 5Y-KQA).",
  inputSchema: { tail_number: z.string().min(2).max(16) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tail_number }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken()!)
      .from("aircraft").select("*").eq("tail_number", tail_number).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No aircraft found with tail number ${tail_number}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { aircraft: data } };
  },
});

export const listFlightsTool = defineTool({
  name: "list_flights",
  title: "List flights",
  description: "List recent or upcoming flights visible to you.",
  inputSchema: {
    status: z.string().optional().describe("Optional status filter (e.g. scheduled, airborne, landed, cancelled)."),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = client(ctx.getToken()!)
      .from("flights")
      .select("id, flight_number, origin, destination, status, scheduled_departure, scheduled_arrival, aircraft_id")
      .order("scheduled_departure", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { flights: data } };
  },
});

export const listCrewTool = defineTool({
  name: "list_crew",
  title: "List crew",
  description: "List crew members visible to you.",
  inputSchema: { limit: z.number().int().min(1).max(200).default(50) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken()!)
      .from("crew").select("id, employee_id, full_name, role, base_station, status").limit(limit);
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { crew: data } };
  },
});

export const listCargoTool = defineTool({
  name: "list_cargo",
  title: "List cargo shipments",
  description: "List cargo shipments visible to you.",
  inputSchema: { limit: z.number().int().min(1).max(200).default(50) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken()!)
      .from("cargo").select("*").limit(limit);
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { cargo: data } };
  },
});

export const whoAmITool = defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in SkyTrack user identity and their organization memberships.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_i, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = client(ctx.getToken()!);
    const [{ data: orgs }, { data: roles }] = await Promise.all([
      sb.from("organization_members").select("org_id, role, organizations(name, tier)"),
      sb.from("user_roles").select("role"),
    ]);
    const payload = {
      user_id: ctx.getUserId(),
      email: ctx.getUserEmail(),
      roles: (roles ?? []).map((r: { role: string }) => r.role),
      organizations: orgs ?? [],
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
  },
});
