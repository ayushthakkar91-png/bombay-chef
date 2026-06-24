/**
 * Dependency-free per-IP rate limiter for public Server Actions.
 *
 * Backend selection:
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses Upstash
 *     Redis over its REST API (works across serverless instances). No SDK needed.
 *   - Otherwise falls back to a per-instance in-memory counter. This is correct
 *     for local dev; in production (multiple serverless instances) it is
 *     best-effort only — it caps abuse per instance and never blocks legit users
 *     or crashes. A one-time warning is logged so the gap is visible.
 *
 * Fixed-window counter keyed by a time bucket, so keys self-rotate each window
 * and a stuck key can never permanently block an IP.
 */

import { headers } from "next/headers";

export type RateResult = { ok: boolean; retryAfter: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Per-instance fallback store.
const mem = new Map<string, { count: number; resetAt: number }>();
let warnedNoRedis = false;

function memHit(rawKey: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  const e = mem.get(rawKey);
  if (!e || now > e.resetAt) {
    mem.set(rawKey, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  e.count += 1;
  if (e.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}

async function redisHit(rawKey: string, limit: number, windowSec: number): Promise<RateResult> {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const key = `${rawKey}:${windowId}`;
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec + 5)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return memHit(rawKey, limit, windowSec); // degrade, never block on infra error
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (count > limit) return { ok: false, retryAfter: windowSec };
    return { ok: true, retryAfter: 0 };
  } catch {
    return memHit(rawKey, limit, windowSec); // never block on a transient Redis error
  }
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns `{ ok: false, retryAfter }` when the caller's IP has exceeded
 * `limit` requests for `bucket` within the rolling `windowSec` window.
 * Always resolves — callers can rely on `.ok`.
 */
export async function rateLimit(bucket: string, opts: { limit: number; windowSec: number }): Promise<RateResult> {
  const ip = await clientIp();
  const rawKey = `rl:${bucket}:${ip}`;
  if (UPSTASH_URL && UPSTASH_TOKEN) return redisHit(rawKey, opts.limit, opts.windowSec);
  if (process.env.NODE_ENV === "production" && !warnedNoRedis) {
    warnedNoRedis = true;
    console.warn("[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — using per-instance in-memory limiter (best-effort across serverless instances).");
  }
  return memHit(rawKey, opts.limit, opts.windowSec);
}
