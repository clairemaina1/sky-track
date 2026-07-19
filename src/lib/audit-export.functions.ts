import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Hash-chained JSONL audit export.
 * Each line: { seq, prev_hash, hash, record }.
 * hash = sha256(prev_hash + canonical_json(record))
 * Final line: { manifest: { count, root_hash, hmac, signed_at } }
 *   where hmac = HMAC-SHA256(AUDIT_SIGNING_SECRET, root_hash|org_id|count|signed_at)
 * Verifier: recompute the chain; recompute the hmac using the shared secret.
 */
export const exportSignedAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    const limit = Math.min(Math.max(data.limit ?? 5000, 1), 20000);
    const { data: rows, error } = await context.supabase
      .from("audit_log")
      .select("id, created_at, user_id, action, entity, entity_id, metadata, org_id")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    const enc = new TextEncoder();
    const toHex = (buf: ArrayBuffer) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const sha = async (s: string) => toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

    const lines: string[] = [];
    let prev = "0".repeat(64);
    let seq = 0;
    for (const r of rows ?? []) {
      seq++;
      const canonical = JSON.stringify(r, Object.keys(r).sort());
      const hash = await sha(prev + canonical);
      lines.push(JSON.stringify({ seq, prev_hash: prev, hash, record: r }));
      prev = hash;
    }

    const signedAt = new Date().toISOString();
    const rootHash = prev;
    const secret = process.env.AUDIT_SIGNING_SECRET!;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(`${rootHash}|${data.orgId}|${seq}|${signedAt}`),
    );
    const hmac = toHex(sig);

    lines.push(
      JSON.stringify({
        manifest: {
          org_id: data.orgId,
          count: seq,
          root_hash: rootHash,
          hmac,
          signed_at: signedAt,
          algorithm: "sha256-chain+hmac-sha256",
          issuer: "SkyTrack AAOS",
        },
      }),
    );

    return { jsonl: lines.join("\n") + "\n", count: seq, root_hash: rootHash, hmac, signed_at: signedAt };
  });
