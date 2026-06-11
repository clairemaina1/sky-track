import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

type ChatBody = {
  messages?: UIMessage[];
  orgId?: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { messages, orgId } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });
        if (!orgId) return new Response("Missing orgId", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

        // Per-user supabase client — all queries are RLS-scoped to the caller.
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Verify membership + resolve role
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const { data: member } = await supabase
          .from("organization_members")
          .select("role, organizations(name, tier)")
          .eq("user_id", userId)
          .eq("org_id", orgId)
          .maybeSingle();
        if (!member) return new Response("Forbidden", { status: 403 });

        const role = member.role as string;
        const orgName = (member as any).organizations?.name ?? "your organization";
        const tier = (member as any).organizations?.tier ?? "commercial";
        const isLeader = role === "admin" || role === "dispatcher";

        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(key);

        const fleetSummary = tool({
          description: "Get a live summary of the fleet: counts by status, AOG aircraft, average health.",
          inputSchema: z.object({}),
          execute: async () => {
            const { data, error } = await supabase
              .from("aircraft")
              .select("tail_number, model, status, health_score, base_airport, next_maintenance_due")
              .eq("org_id", orgId);
            if (error) return { error: error.message };
            const total = data.length;
            const byStatus: Record<string, number> = {};
            let healthSum = 0;
            const aog: string[] = [];
            for (const a of data) {
              byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
              healthSum += Number(a.health_score);
              if (a.status === "AOG") aog.push(a.tail_number);
            }
            return {
              total,
              byStatus,
              avgHealth: total ? Math.round(healthSum / total) : 0,
              aogAircraft: aog,
            };
          },
        });

        const crewSummary = tool({
          description: "Get a summary of crew: counts by status and role.",
          inputSchema: z.object({}),
          execute: async () => {
            const { data, error } = await supabase
              .from("crew")
              .select("role, status")
              .eq("org_id", orgId);
            if (error) return { error: error.message };
            const byStatus: Record<string, number> = {};
            const byRole: Record<string, number> = {};
            for (const c of data) {
              byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
              byRole[c.role] = (byRole[c.role] ?? 0) + 1;
            }
            return { total: data.length, byStatus, byRole };
          },
        });

        const cargoSummary = tool({
          description: "Get a summary of cargo shipments: totals, weight, delays.",
          inputSchema: z.object({}),
          execute: async () => {
            const { data, error } = await supabase
              .from("cargo")
              .select("status, weight_kg, delay_notified")
              .eq("org_id", orgId);
            if (error) return { error: error.message };
            const totalKg = data.reduce((s, c) => s + Number(c.weight_kg), 0);
            const delayed = data.filter((c) => c.delay_notified).length;
            return { total: data.length, totalKg, delayed };
          },
        });

        const maintenanceSummary = tool({
          description: "Get open maintenance work orders.",
          inputSchema: z.object({}),
          execute: async () => {
            const { data, error } = await supabase
              .from("maintenance")
              .select("status, priority")
              .eq("org_id", orgId);
            if (error) return { error: error.message };
            const byStatus: Record<string, number> = {};
            const byPriority: Record<string, number> = {};
            for (const m of data) {
              byStatus[(m as any).status] = (byStatus[(m as any).status] ?? 0) + 1;
              byPriority[(m as any).priority ?? "normal"] = (byPriority[(m as any).priority ?? "normal"] ?? 0) + 1;
            }
            return { total: data.length, byStatus, byPriority };
          },
        });

        // Leader-only: full performance overview
        const tools: Record<string, ReturnType<typeof tool>> = {
          fleetSummary,
          crewSummary,
          cargoSummary,
          maintenanceSummary,
        };

        if (isLeader) {
          tools.performanceOverview = tool({
            description:
              "Leader-only: combined operational performance overview across fleet, crew, cargo, and maintenance.",
            inputSchema: z.object({}),
            execute: async () => {
              const [f, c, g, m] = await Promise.all([
                supabase.from("aircraft").select("status, health_score").eq("org_id", orgId),
                supabase.from("crew").select("status").eq("org_id", orgId),
                supabase.from("cargo").select("status, delay_notified, weight_kg").eq("org_id", orgId),
                supabase.from("maintenance").select("status, priority").eq("org_id", orgId),
              ]);
              const aircraft = f.data ?? [];
              return {
                fleet: {
                  total: aircraft.length,
                  aog: aircraft.filter((a) => a.status === "AOG").length,
                  airborne: aircraft.filter((a) => a.status === "In-Flight").length,
                  avgHealth: aircraft.length
                    ? Math.round(aircraft.reduce((s, a) => s + Number(a.health_score), 0) / aircraft.length)
                    : 0,
                },
                crew: {
                  total: (c.data ?? []).length,
                  onDuty: (c.data ?? []).filter((x) => x.status === "On-Duty").length,
                },
                cargo: {
                  total: (g.data ?? []).length,
                  delayed: (g.data ?? []).filter((x) => x.delay_notified).length,
                  totalKg: (g.data ?? []).reduce((s, x) => s + Number(x.weight_kg), 0),
                },
                maintenance: {
                  total: (m.data ?? []).length,
                  critical: (m.data ?? []).filter((x: any) => x.priority === "critical").length,
                },
              };
            },
          });
        }

        const system = `You are SkyTrack Copilot, an aviation operations assistant for ${orgName} (${tier}).
The user is signed in as role: "${role}". ${isLeader ? "They are a leader — you may share full operational performance summaries." : "They are an operator — answer scope-limited questions about their work; do not expose admin-only financials or staff PII."}
Use the provided tools to fetch live data before answering. Be concise, use bullet points and markdown, and surface numbers clearly. All times are UTC. If a question is outside SkyTrack operations, politely redirect.`;

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(8),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
