import { describe, it, expect } from "vitest";

import {
  closedMessage,
  hhmm,
  isOpenAt,
  isValidSlot,
  londonInstant,
  londonTime,
  minutesOfDay,
  nextOpening,
  slotsForToday,
  type DayHours,
} from "./hours";

/**
 * The hours as the owner gave them, 2026-11-16:
 *   collection  17:30 – 22:45 every day
 *   delivery    17:30 – 22:30, except Monday from 18:00
 * Monday opens late for both, because the shop itself does.
 */
const HOURS: DayHours[] = [
  ...[0, 2, 3, 4, 5, 6].map((weekday) => ({ fulfilment: "collection" as const, weekday, opensAt: "17:30", closesAt: "22:45", isOpen: true })),
  { fulfilment: "collection", weekday: 1, opensAt: "18:00", closesAt: "22:45", isOpen: true },
  ...[0, 2, 3, 4, 5, 6].map((weekday) => ({ fulfilment: "delivery" as const, weekday, opensAt: "17:30", closesAt: "22:30", isOpen: true })),
  { fulfilment: "delivery", weekday: 1, opensAt: "18:00", closesAt: "22:30", isOpen: true },
];

/** A London wall-clock time, as an instant. Wednesday unless said otherwise. */
const at = (day: number, time: string, month = 11) => londonInstant(2026, month, day, minutesOfDay(time)!);

// 2026-11-18 is a Wednesday; 2026-11-16 a Monday.
const WED = 18;
const MON = 16;

describe("reading the clock in London", () => {
  it("is not fooled by the server running in UTC", () => {
    // Midsummer: London is an hour ahead of UTC, so 21:35 UTC is 22:35 here —
    // past the drivers' 22:30 but inside the counter's 22:45. Reading the
    // server clock as local would make it 21:35 and take the delivery.
    const summerEvening = new Date("2026-06-20T21:35:00Z");
    expect(londonTime(summerEvening).hour).toBe(22);
    expect(londonTime(summerEvening).minute).toBe(35);
    expect(isOpenAt(HOURS, summerEvening, "delivery")).toBe(false);
    // The counter is still open until 22:45.
    expect(isOpenAt(HOURS, summerEvening, "collection")).toBe(true);
  });

  it("survives the night the clocks go back", () => {
    // 25 October 2026, 02:00 BST becomes 01:00 GMT. A naive offset lands an
    // hour out either side of it.
    const evening = londonInstant(2026, 10, 25, minutesOfDay("19:00")!);
    expect(londonTime(evening).hour).toBe(19);
    expect(hhmm(londonTime(evening).minutesOfDay)).toBe("19:00");
  });
});

describe("whether we are open", () => {
  it("opens at half five and not a minute before", () => {
    expect(isOpenAt(HOURS, at(WED, "17:29"), "collection")).toBe(false);
    expect(isOpenAt(HOURS, at(WED, "17:30"), "collection")).toBe(true);
  });

  it("keeps the counter open a quarter of an hour after the drivers stop", () => {
    expect(isOpenAt(HOURS, at(WED, "22:35"), "delivery")).toBe(false);
    expect(isOpenAt(HOURS, at(WED, "22:35"), "collection")).toBe(true);
    expect(isOpenAt(HOURS, at(WED, "22:45"), "collection")).toBe(false);
  });

  it("starts at six on a Monday", () => {
    expect(isOpenAt(HOURS, at(MON, "17:45"), "collection")).toBe(false);
    expect(isOpenAt(HOURS, at(MON, "18:00"), "collection")).toBe(true);
    expect(isOpenAt(HOURS, at(MON, "17:45"), "delivery")).toBe(false);
  });

  it("is shut at lunchtime", () => {
    expect(isOpenAt(HOURS, at(WED, "12:30"), "collection")).toBe(false);
    expect(isOpenAt(HOURS, at(WED, "02:00"), "delivery")).toBe(false);
  });
});

describe("the times a customer can pick", () => {
  it("offers nothing sooner than the kitchen can cook", () => {
    // 18:02, 20 minutes to cook → first slot is 18:30, not 18:22.
    const slots = slotsForToday(HOURS, at(WED, "18:02"), "collection", { leadMinutes: 20 });
    expect(hhmm(londonTime(slots[0]).minutesOfDay)).toBe("18:30");
  });

  it("starts at opening time for someone ordering in the afternoon", () => {
    const slots = slotsForToday(HOURS, at(WED, "15:00"), "delivery", { leadMinutes: 45 });
    expect(hhmm(londonTime(slots[0]).minutesOfDay)).toBe("17:30");
  });

  it("stops at closing, and each fulfilment at its own", () => {
    const collection = slotsForToday(HOURS, at(WED, "15:00"), "collection", { leadMinutes: 20 });
    const delivery = slotsForToday(HOURS, at(WED, "15:00"), "delivery", { leadMinutes: 45 });
    expect(hhmm(londonTime(collection[collection.length - 1]).minutesOfDay)).toBe("22:45");
    expect(hhmm(londonTime(delivery[delivery.length - 1]).minutesOfDay)).toBe("22:30");
  });

  it("offers nothing once the last slot has passed", () => {
    expect(slotsForToday(HOURS, at(WED, "22:40"), "delivery", { leadMinutes: 45 })).toEqual([]);
  });

  it("never offers tomorrow", () => {
    // Asked at four in the afternoon, every slot is still today.
    const slots = slotsForToday(HOURS, at(WED, "16:00"), "collection", { leadMinutes: 20 });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) expect(londonTime(s).day).toBe(WED);
  });
});

describe("a slot the browser sent back", () => {
  const now = at(WED, "18:00");

  it("is accepted when it is one we offered", () => {
    const slots = slotsForToday(HOURS, now, "collection", { leadMinutes: 20 });
    expect(isValidSlot(HOURS, now, slots[2], "collection", { leadMinutes: 20 })).toBe(true);
  });

  it("is refused when it is after closing", () => {
    // The form can be edited; the kitchen cannot.
    expect(isValidSlot(HOURS, now, at(WED, "23:30"), "collection", { leadMinutes: 20 })).toBe(false);
  });

  it("is refused when it is too soon to cook", () => {
    expect(isValidSlot(HOURS, now, at(WED, "18:05"), "collection", { leadMinutes: 20 })).toBe(false);
  });

  it("is refused when it belongs to the other fulfilment", () => {
    // 22:45 is a collection slot. A delivery for it would send a driver out
    // after the drivers have stopped.
    expect(isValidSlot(HOURS, now, at(WED, "22:45"), "delivery", { leadMinutes: 45 })).toBe(false);
  });
});

describe("what a closed shop says", () => {
  it("points at today when there is still an evening to come", () => {
    expect(closedMessage(HOURS, at(WED, "11:00"), "delivery")).toContain("today at 17:30");
  });

  it("points at tomorrow once the evening is over", () => {
    expect(closedMessage(HOURS, at(WED, "23:30"), "delivery")).toContain("tomorrow");
  });

  it("gives Monday's later opening", () => {
    expect(closedMessage(HOURS, at(MON, "09:00"), "delivery")).toContain("18:00");
  });
});

describe("when we next open", () => {
  it("is now, when we are already open", () => {
    const now = at(WED, "19:00");
    expect(nextOpening(HOURS, now, "collection")).toEqual(now);
  });

  it("is this evening, when asked in the morning", () => {
    const next = nextOpening(HOURS, at(WED, "09:00"), "collection");
    expect(hhmm(londonTime(next!).minutesOfDay)).toBe("17:30");
    expect(londonTime(next!).day).toBe(WED);
  });
});
