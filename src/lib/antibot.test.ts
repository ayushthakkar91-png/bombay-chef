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

  it("rejects a tampered or unreadable timestamp", () => {
    expect(automatedReason({ honeypot: "", renderedAt: "not-a-number" })).toBe("unreadable timestamp");
    expect(automatedReason({ honeypot: "", renderedAt: now() + 60_000 })).toBe("timestamp in the future");
  });

  it("rejects a form left open for half a day", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 13 * 3600 * 1000 })).toBe("stale form");
  });

  it("honours a custom minimum for slower forms", () => {
    expect(automatedReason({ honeypot: "", renderedAt: now() - 4_000 }, 10)).toMatch(/submitted after/);
  });
});
