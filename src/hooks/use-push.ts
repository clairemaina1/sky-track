import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { savePushSubscription, sendTestPush } from "@/lib/push.functions";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid-public";

type Status = "unsupported" | "denied" | "granted" | "default" | "unknown";

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export function usePush() {
  const [status, setStatus] = useState<Status>("unknown");
  const save = useServerFn(savePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  const enable = useCallback(async () => {
    const reg = await getRegistration();
    if (!reg) throw new Error("Push not supported in this browser");
    const perm = await Notification.requestPermission();
    setStatus(perm as Status);
    if (perm !== "granted") return { ok: false, reason: perm };

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error("Malformed subscription");
    }
    await save({
      data: {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      },
    });
    return { ok: true };
  }, [save]);

  const sendTest = useCallback(async () => {
    return test({});
  }, [test]);

  return { status, enable, sendTest };
}
