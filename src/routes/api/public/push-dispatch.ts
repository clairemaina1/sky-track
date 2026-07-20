import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Called by the Postgres trigger `enqueue_push_for_notification` via pg_net
// after a row is inserted into public.notifications. Verifies a shared secret,
// looks up the target user's push subscriptions, and delivers an encrypted
// browser push. Idempotent-safe: failures on individual subs are swallowed.
export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.PUSH_DISPATCH_SECRET;
        if (!expected) return new Response("dispatch not configured", { status: 503 });
        const provided = request.headers.get("x-dispatch-secret");
        if (!provided || provided !== expected) return new Response("forbidden", { status: 403 });

        let body: { notification_id?: string };
        try { body = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const id = body.notification_id;
        if (!id) return new Response("missing notification_id", { status: 400 });

        const url = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!url || !serviceKey) return new Response("supabase not configured", { status: 500 });
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

        const { data: n, error } = await admin
          .from("notifications")
          .select("user_id, title, body, action_url, priority")
          .eq("id", id)
          .maybeSingle();
        if (error || !n || !n.user_id) return new Response("ok", { status: 200 });

        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", n.user_id);
        if (!subs || subs.length === 0) return new Response("ok", { status: 200 });

        const { deliverPush } = await import("@/lib/push.server");
        let sent = 0;
        await Promise.all(
          subs.map(async (s) => {
            try {
              await deliverPush(s, {
                title: n.title ?? "SkyTrack",
                body: n.body ?? "",
                url: n.action_url ?? "/",
                priority: (n.priority as "critical" | "high" | "normal" | "low") ?? "normal",
              });
              sent++;
            } catch { /* dead sub, skip */ }
          }),
        );
        return new Response(JSON.stringify({ sent }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
