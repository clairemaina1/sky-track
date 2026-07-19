// Server-only Web Push sender. Never import from client-reachable modules at top level.
import { ApplicationServerKeys, generatePushHTTPRequest } from "webpush-webcrypto";

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  priority?: "critical" | "high" | "normal" | "low";
  tag?: string;
}

let keysPromise: Promise<ApplicationServerKeys> | null = null;

function getKeys() {
  if (!keysPromise) {
    const publicKey = process.env.VAPID_PUBLIC_KEY!;
    const privateKey = process.env.VAPID_PRIVATE_KEY!;
    keysPromise = ApplicationServerKeys.fromJSON({ publicKey, privateKey });
  }
  return keysPromise;
}

export async function deliverPush(sub: PushSub, payload: PushPayload): Promise<Response> {
  const keys = await getKeys();
  const { headers, body, endpoint } = await generatePushHTTPRequest({
    applicationServerKeys: keys,
    payload: JSON.stringify(payload),
    target: {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    adminContact: process.env.VAPID_SUBJECT ?? "mailto:ops@skytrack.aero",
    ttl: 60 * 60 * 24,
    urgency: payload.priority === "critical" || payload.priority === "high" ? "high" : "normal",
  });
  return fetch(endpoint, { method: "POST", headers, body });
}
