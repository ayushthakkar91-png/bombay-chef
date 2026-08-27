import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// flags.ts reads NEXT_PUBLIC_FEATURE_ORDERING at module load, so each test stubs
// the env and re-imports the module graph fresh.
describe("ordering routing", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("routes an internal branch to the on-site menu when the flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ORDERING", "true");
    const { orderHrefFor } = await import("./routing");
    const { branchBySlug } = await import("@/data/locations");
    const r = orderHrefFor(branchBySlug("balham")!);
    expect(r.external).toBe(false);
    expect(r.href).toBe("/order/menu?loc=balham");
  });

  it("routes an external branch to the locator even when the flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ORDERING", "true");
    const { orderHrefFor } = await import("./routing");
    const { branchBySlug } = await import("@/data/locations");
    const r = orderHrefFor(branchBySlug("kilburn")!);
    expect(r.external).toBe(true);
    expect(r.href).toContain("bombaybicyclechef.uk");
  });

  it("routes every branch external when the master flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ORDERING", "false");
    const { orderHrefFor, isInternalOrdering } = await import("./routing");
    const { branchBySlug } = await import("@/data/locations");
    expect(orderHrefFor(branchBySlug("balham")!).external).toBe(true);
    expect(isInternalOrdering("balham")).toBe(false);
  });

  it("isInternalOrdering is true only for the internal branch with the flag on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ORDERING", "true");
    const { isInternalOrdering } = await import("./routing");
    expect(isInternalOrdering("balham")).toBe(true);
    expect(isInternalOrdering("battersea")).toBe(false);
    expect(isInternalOrdering("kilburn")).toBe(false);
  });
});
