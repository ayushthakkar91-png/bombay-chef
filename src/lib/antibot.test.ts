import { describe, it, expect } from "vitest";

import { automatedReason } from "./antibot";

const now = () => Date.now();

describe("invisible bot checks", () => {
  it("lets a normal submission through", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 30_000 })).toBeNull();
  });

  it("catches a filled honeypot, whatever the timing", () => {
    expect(automatedReason({ honeypot: "https://spam.example", renderedAt: now() - 60_000 })).toBe("honeypot filled");
  });

  it("ignores whitespace in the honeypot rather than treating it as filled", () => {
    expect(automatedReason({ honeypot: "   ", renderedAt: now() - 30_000 })).toBeNull();
  });

  it("catches an instant submission", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 200 })).toMatch(/submitted after/);
  });

  it("allows a fast but plausible human", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 4_000 })).toBeNull();
  });

  it("does not drop a submission that omits the timestamp", () => {
    // An older cached page will not have the field. Judging it on the honeypot
    // alone is the safe failure: better a little spam than a lost enquiry.
    expect(automatedReason({ honeypot: "" })).toBeNull();
    expect(automatedReason({ honeypot: "", renderedAt: null })).toBeNull();
    expect(automatedReason({ honeypot: "", renderedAt: "" })).toBeNull();
  });

  it("rejects an unreadable timestamp", () => {
    expect(automatedReason({ honeypot: "", renderedAt: "not-a-number" })).toBe("unreadable timestamp");
  });

  it("lets a fast clock through rather than calling a customer a bot", () => {
    // The timestamp came from the visitor clock and was compared against the
    // server one. A device running a few seconds fast is common; being refused
    // for it is not acceptable.
    expect(automatedReason({ honeypot: "", renderedAt: now() + 60_000 })).toBeNull();
  });

  it("rejects a form left open for half a day", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 13 * 3600 * 1000 })).toBe("stale form");
  });

  it("honours a custom minimum for slower forms", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 4_000 }, 10)).toMatch(/submitted after/);
  });

  describe("duration, which is what the forms now send", () => {
    it("accepts a normal fill", () => {
      expect(automatedReason({ honeypot: "", elapsedMs: 20_000 })).toBeNull();
    });

    it("catches an instant submission", () => {
      expect(automatedReason({ honeypot: "", elapsedMs: 150 })).toMatch(/submitted after/);
    });

    it("is immune to clock skew, unlike a timestamp", () => {
      // Same submission, a device whose clock is a minute fast. The duration is
      // measured in the browser, so the server never compares two clocks.
      expect(automatedReason({ honeypot: "", elapsedMs: 20_000, renderedAt: now() + 60_000 })).toBeNull();
    });

    it("still defers to the honeypot", () => {
      expect(automatedReason({ honeypot: "spam", elapsedMs: 20_000 })).toBe("honeypot filled");
    });

    it("rejects a nonsense duration", () => {
      expect(automatedReason({ honeypot: "", elapsedMs: -5 })).toBe("unreadable duration");
      expect(automatedReason({ honeypot: "", elapsedMs: "abc" })).toBe("unreadable duration");
    });

    it("rejects a form left open half a day", () => {
      expect(automatedReason({ honeypot: "", elapsedMs: 13 * 3600 * 1000 })).toBe("stale form");
    });
  });
});
