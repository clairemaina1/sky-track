import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  disruption: z.string().min(3).max(500),
  affectedFlights: z.number().int().min(0).max(500).default(1),
  paxImpacted: z.number().int().min(0).max(100000).default(120),
  station: z.string().max(8).default("HKJK"),
});

export interface RecoveryPlan {
  summary: string;
  severity: 1 | 2 | 3 | 4 | 5;
  options: {
    title: string;
    actionType: string;
    summary: string;
    steps: string[];
    delayReductionMin: number;
    estimatedCostUsd: number;
    confidence: number;
  }[];
  caveats: string[];
}

export const generateRecoveryPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<RecoveryPlan> => {
    // Authorization: only dispatcher/admin may invoke the AI gateway
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: isDispatcher }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "dispatcher" }),
    ]);
    if (!isAdmin && !isDispatcher) {
      throw new Error("Forbidden: dispatcher role required.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error("LOVABLE_API_KEY is not configured.");
    }

    const sys = `You are a senior airline OCC (Operations Control Center) AI. You produce IRROPS recovery plans that respect ICAO Annex 6 FDP rest rules, ETOPS, and slot constraints. Reply ONLY as strict JSON matching the schema. No markdown, no commentary.`;

    const user = `Disruption: ${data.disruption}
Station: ${data.station}
Affected flights: ${data.affectedFlights}
Pax impacted: ${data.paxImpacted}

Return JSON:
{
  "summary": "1-sentence executive summary",
  "severity": 1-5,
  "options": [
    {
      "title": "short title",
      "actionType": "Aircraft_Swap|Crew_Reallocation|Route_Divert|Delay_Accept|Cancellation|Charter_Substitute|Wet_Lease|Pax_Reprotection",
      "summary": "1 sentence",
      "steps": ["step 1", "step 2", "step 3"],
      "delayReductionMin": number,
      "estimatedCostUsd": number,
      "confidence": 0.0-1.0
    }
  ],
  "caveats": ["regulatory or operational caveats"]
}

Provide exactly 3 options ranked by recommendation.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI gateway error ${resp.status}: ${txt.slice(0, 200)}`);
    }
    const j = await resp.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as RecoveryPlan;
    } catch {
      throw new Error("AI returned non-JSON response.");
    }
  });
