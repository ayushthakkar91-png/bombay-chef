import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub next/headers so rateLimit can resolve a client IP outside a request.
vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-real-ip", "1.2.3.4"]]),
}));

describe("rateLimit failClosed", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies when Redis is unset in production and failClosed=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { rateLimit } = await import("./ratelimit");
    const r = await rateLimit("checkout-test", { limit: 10, windowSec: 60, failClosed: true });
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("allows best-effort when failClosed is not set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { rateLimit } = await import("./ratelimit");
    const r = await rateLimit("cosmetic-test", { limit: 10, windowSec: 60 });
    expect(r.ok).toBe(true);
  });

  it("does not fail closed outside production even with failClosed=true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { rateLimit } = await import("./ratelimit");
    const r = await rateLimit("dev-test", { limit: 10, windowSec: 60, failClosed: true });
    expect(r.ok).toBe(true);
  });
});
