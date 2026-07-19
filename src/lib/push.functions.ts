import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Save a browser Web Push subscription for the current user. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fire a test push to the calling user's own subscriptions. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs } = await context.supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", context.userId);
    if (!subs || subs.length === 0) return { sent: 0 };
    const { deliverPush } = await import("./push.server");
    let sent = 0;
    for (const s of subs) {
      try {
        await deliverPush(s, {
          title: "SkyTrack test push",
          body: "You are now wired for offered-flight alerts.",
          url: "/",
          priority: "normal",
        });
        sent++;
      } catch (_) {
        // silently drop dead subscriptions
      }
    }
    return { sent };
  });

/** Send a push to a target user (called by app code that also creates a DB notification). */
export const pushToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      targetUserId: string;
      title: string;
      body: string;
      url?: string;
      priority?: "critical" | "high" | "normal" | "low";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    // Only allow within same org (RLS on organization_members enforces this via the caller's supabase client).
    const { data: sameOrg } = await context.supabase
      .from("organization_members")
      .select("user_id")
      .eq("user_id", data.targetUserId)
      .limit(1);
    if (!sameOrg || sameOrg.length === 0) throw new Error("Target not visible to caller");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", data.targetUserId);
    if (!subs || subs.length === 0) return { sent: 0 };
    const { deliverPush } = await import("./push.server");
    let sent = 0;
    for (const s of subs) {
      try {
        await deliverPush(s, {
          title: data.title,
          body: data.body,
          url: data.url ?? "/",
          priority: data.priority ?? "normal",
        });
        sent++;
      } catch (_) {
        /* drop */
      }
    }
    return { sent };
  });
