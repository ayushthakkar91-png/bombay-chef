import { describe, it, expect } from "vitest";

import { PRINT_LEAD_MS, readyToPrint, releaseCutoff } from "./scheduling";

const at = (iso: string) => new Date(iso);

describe("holding a scheduled ticket back", () => {
  it("prints an ordinary order straight away", () => {
    // Every normal order has no slot. Nothing about scheduling may slow the
    // bulk of the evening's trade down.
    expect(readyToPrint(null, at("2026-11-18T18:00:00Z"))).toBe(true);
    expect(readyToPrint(undefined, at("2026-11-18T18:00:00Z"))).toBe(true);
  });

  it("holds an order placed well before its slot", () => {
    // Ordered at 18:00 for 20:30. Printed now, it would be cooked now, and
    // sit under a lamp for two hours.
    expect(readyToPrint("2026-11-18T20:30:00Z", at("2026-11-18T18:00:00Z"))).toBe(false);
  });

  it("releases it an hour before", () => {
    expect(readyToPrint("2026-11-18T20:30:00Z", at("2026-11-18T19:29:00Z"))).toBe(false);
    expect(readyToPrint("2026-11-18T20:30:00Z", at("2026-11-18T19:30:00Z"))).toBe(true);
  });

  it("prints a slot that has already passed", () => {
    // The kitchen was closed, the printer was off, whatever happened. A late
    // ticket still has to come out.
    expect(readyToPrint("2026-11-18T19:00:00Z", at("2026-11-18T21:00:00Z"))).toBe(true);
  });

  it("prints rather than strands an unreadable time", () => {
    // A bad timestamp must not hold an order back for ever; paper and a
    // confused chef beat a silently missing order.
    expect(readyToPrint("not a date", at("2026-11-18T18:00:00Z"))).toBe(true);
  });
});

describe("the database cutoff", () => {
  it("is one hour ahead, so a query finds what is due", () => {
    const now = at("2026-11-18T18:00:00Z");
    expect(releaseCutoff(now)).toBe("2026-11-18T19:00:00.000Z");
    expect(new Date(releaseCutoff(now)).getTime() - now.getTime()).toBe(PRINT_LEAD_MS);
  });

  it("agrees with readyToPrint at the boundary", () => {
    // The two are used in different places — one filters SQL, the other
    // decides in TypeScript — and they must not drift apart.
    //
    // Compared as instants, not as text: Postgres compares timestamptz, and
    // "…20:30:00Z" and "…20:30:00.000Z" are the same moment while being
    // different strings.
    const now = at("2026-11-18T19:30:00Z");
    const slot = "2026-11-18T20:30:00Z";
    expect(new Date(slot).getTime()).toBeLessThanOrEqual(new Date(releaseCutoff(now)).getTime());
    expect(readyToPrint(slot, now)).toBe(true);
  });
});
