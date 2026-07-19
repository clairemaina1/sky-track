// Public VAPID key — safe to embed client-side (browsers require the app server public key to subscribe).
export const VAPID_PUBLIC_KEY =
  "BDL1rli_8TxMlJtRSe2nxskLbdM5PH_fSWrb2Pbjucgoq0ZpgDOERibnmcXPQ2Dxvcsda_6d-KmX_hAUYlOZ_z0";

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
