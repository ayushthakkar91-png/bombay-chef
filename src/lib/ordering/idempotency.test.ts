import { describe, it, expect } from "vitest";

import {
  resumeDecision,
  IDEMPOTENCY_WINDOW_MS,
  COMPLETED_RESUME_WINDOW_MS,
} from "./idempotency";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

describe("resuming an order from its idempotency key", () => {
  describe("the case that lost a real order", () => {
    it("ignores yesterday's key and places a new order", () => {
      // A £1 order placed on one day, the same basket ordered the next: the key
      // was still in the browser, matched the finished order, and the customer
      // was shown its tracking page. No new order, no ticket, no error.
      expect(resumeDecision("ready", 24 * HOURS)).toBe("new");
      expect(resumeDecision("paid", 24 * HOURS)).toBe("new");
      expect(resumeDecision("completed", 24 * HOURS)).toBe("new");
    });

    it("ignores a finished order from an hour ago", () => {
      // The narrower version of the same failure: inside the two-hour window,
      // but the previous order is done and this is plainly a new one.
      expect(resumeDecision("paid", 1 * HOURS)).toBe("new");
      expect(resumeDecision("ready_for_collection", 30 * MINUTES)).toBe("new");
    });
  });

  describe("what the key is actually for", () => {
    it("returns the same order for a double-click", () => {
      expect(resumeDecision("paid", 2 * SECONDS)).toBe("resume");
      expect(resumeDecision("pending_payment", 2 * SECONDS)).toBe("resume");
    });

    it("still absorbs a slow retry just inside the window", () => {
      expect(resumeDecision("paid", COMPLETED_RESUME_WINDOW_MS - SECONDS)).toBe("resume");
    });

    it("stops resuming a finished order the moment that window passes", () => {
      expect(resumeDecision("paid", COMPLETED_RESUME_WINDOW_MS + SECONDS)).toBe("new");
    });
  });

  describe("an order still awaiting payment", () => {
    it("resumes for hours, because the payment may yet complete", () => {
      expect(resumeDecision("pending_payment", 10 * MINUTES)).toBe("resume");
      expect(resumeDecision("pending_payment", 90 * MINUTES)).toBe("resume");
      expect(resumeDecision("pending_payment", IDEMPOTENCY_WINDOW_MS - MINUTES)).toBe("resume");
    });

    it("gives up once the outer window passes", () => {
      expect(resumeDecision("pending_payment", IDEMPOTENCY_WINDOW_MS + MINUTES)).toBe("new");
    });
  });

  describe("cancelled and refunded", () => {
    it("tells the customer rather than resuming or silently reordering", () => {
      // They may believe the food is still coming; replacing it with a fresh
      // order behind their back would be worse than saying so.
      expect(resumeDecision("cancelled", 1 * MINUTES)).toBe("cancelled");
      expect(resumeDecision("refunded", 1 * MINUTES)).toBe("cancelled");
    });

    it("falls back to a new order once the key is stale", () => {
      expect(resumeDecision("cancelled", 3 * HOURS)).toBe("new");
    });
  });

  it("treats an unknown status as finished rather than resumable", () => {
    // Safer default: a new order is a visible, correctable outcome. Resuming
    // something we do not understand is how an order disappears.
    expect(resumeDecision("something_new", 1 * HOURS)).toBe("new");
    expect(resumeDecision("something_new", 2 * SECONDS)).toBe("resume");
  });
});
