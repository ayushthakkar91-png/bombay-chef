import { describe, it, expect } from "vitest";

import { pickNearestBranch } from "./delivery";

/** Both branches, as the database has them: 3-mile radius each. */
const balham = (miles: number, feePence: number) => ({ slug: "balham", miles, feePence, withinBands: true, radiusMiles: 3 });
const battersea = (miles: number, feePence: number) => ({ slug: "battersea", miles, feePence, withinBands: true, radiusMiles: 3 });

/** The furthest band in migration 0030. */
const BANDS = 3;

describe("choosing which kitchen cooks", () => {
  it("sends Tooting to Balham, not Battersea", () => {
    // SW17 7LT, measured: 1.13 miles from Balham, 2.40 from Battersea. Both
    // inside the radius, so both *could* take it — and the customer was being
    // sent to the far one, paying the £3.99 band instead of £1.99 and waiting
    // longer while the wrong kitchen cooked.
    const best = pickNearestBranch([battersea(2.4, 399), balham(1.13, 199)], BANDS);
    expect(best?.slug).toBe("balham");
  });

  it("does not care what order the branches arrive in", () => {
    // The old version effectively depended on this, which is why the bug was
    // invisible until a second branch existed.
    const a = pickNearestBranch([balham(1.13, 199), battersea(2.4, 399)], BANDS);
    const b = pickNearestBranch([battersea(2.4, 399), balham(1.13, 199)], BANDS);
    expect(a?.slug).toBe(b?.slug);
  });

  it("ignores a branch the postcode is outside the radius of", () => {
    const best = pickNearestBranch([balham(4.2, 399), battersea(2.9, 399)], BANDS);
    expect(best?.slug).toBe("battersea");
  });

  it("ignores a branch that is inside its radius but beyond every band", () => {
    // A branch may be configured to reach 5 miles while the bands stop at 3.
    // Outside every band means "we do not deliver that far", not "free".
    const far = { slug: "far", miles: 4.5, feePence: 0, withinBands: false, radiusMiles: 5 };
    expect(pickNearestBranch([far], BANDS)).toBeNull();
  });

  it("prefers the cheaper delivery when two are the same distance", () => {
    const best = pickNearestBranch(
      [{ ...battersea(2, 399) }, { ...balham(2, 199) }],
      BANDS,
    );
    expect(best?.slug).toBe("balham");
  });

  it("returns nothing when no branch can reach the postcode", () => {
    expect(pickNearestBranch([balham(6, 399), battersea(7, 399)], BANDS)).toBeNull();
  });

  it("falls back to each branch's own radius when no bands are configured", () => {
    // listDeliveryTiers() returning empty must not block every delivery.
    const best = pickNearestBranch([balham(2.5, 250)], null);
    expect(best?.slug).toBe("balham");
  });
});
