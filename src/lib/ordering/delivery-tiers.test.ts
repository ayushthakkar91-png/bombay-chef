import { describe, it, expect } from "vitest";

import { feeForMiles, freeDeliveryApplies, maxDeliveryMiles, type DeliveryTier } from "./delivery-tiers";

// The bands shipped in migration 0030: 1 mile free, 2 miles £1.99, 3 miles £3.99.
const BANDS: DeliveryTier[] = [
  { maxMiles: 1, feePence: 0 },
  { maxMiles: 2, feePence: 199 },
  { maxMiles: 3, feePence: 399 },
];

describe("delivery bands", () => {
  it("charges nothing inside the first band", () => {
    expect(feeForMiles(0.2, BANDS)).toBe(0);
    expect(feeForMiles(0.99, BANDS)).toBe(0);
  });

  it("treats a band's distance as included, not excluded", () => {
    expect(feeForMiles(1, BANDS)).toBe(0);
    expect(feeForMiles(2, BANDS)).toBe(199);
    expect(feeForMiles(3, BANDS)).toBe(399);
  });

  it("moves up a band as soon as the distance is exceeded", () => {
    expect(feeForMiles(1.01, BANDS)).toBe(199);
    expect(feeForMiles(2.01, BANDS)).toBe(399);
  });

  it("returns null past the last band — too far, not free", () => {
    expect(feeForMiles(3.01, BANDS)).toBeNull();
    expect(feeForMiles(50, BANDS)).toBeNull();
  });

  it("returns null when no bands are configured, so callers can fall back", () => {
    expect(feeForMiles(1, [])).toBeNull();
  });

  it("does not charge extra for a nonsense distance", () => {
    expect(feeForMiles(Number.NaN, BANDS)).toBe(0);
    expect(feeForMiles(-5, BANDS)).toBe(0);
  });

  it("reports the furthest band as the delivery limit", () => {
    expect(maxDeliveryMiles(BANDS)).toBe(3);
    expect(maxDeliveryMiles([])).toBeNull();
  });

  it("works when the bands arrive out of order", () => {
    const jumbled = [BANDS[2], BANDS[0], BANDS[1]];
    const sorted = [...jumbled].sort((a, b) => a.maxMiles - b.maxMiles);
    expect(feeForMiles(1.5, sorted)).toBe(199);
    expect(maxDeliveryMiles(jumbled)).toBe(3);
  });
});

describe("free delivery threshold", () => {
  it("is off when no threshold is set", () => {
    expect(freeDeliveryApplies(10_000, null)).toBe(false);
  });

  it("treats zero as off, not as free delivery on everything", () => {
    // Typing 0 into the admin box is the obvious way to say "turn this off".
    // Reading it as a threshold would give away every delivery, and nothing on
    // the screen would say so.
    expect(freeDeliveryApplies(1, 0)).toBe(false);
    expect(freeDeliveryApplies(10_000, 0)).toBe(false);
  });

  it("applies at the threshold and above", () => {
    expect(freeDeliveryApplies(3_000, 3_000)).toBe(true);
    expect(freeDeliveryApplies(3_001, 3_000)).toBe(true);
  });

  it("does not apply below it", () => {
    expect(freeDeliveryApplies(2_999, 3_000)).toBe(false);
  });
});
