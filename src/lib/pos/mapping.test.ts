import { describe, it, expect } from "vitest";
import { forwardStatusPath, appStatusToBbc, bbcStatusToApp, readyToTicket, orderToPosJson, PAYMENT_SETTLE_MS } from "./mapping";

/** A minimal live order row, as the till query returns one. */
const BASE = {
  id: "o1",
  code: "30811412",
  status: "paid",
  fulfilment: "delivery",
  contact_name: "Ainslie McLennan",
  contact_phone: "+447771976993",
  total_pence: 2265,
  subtotal_pence: 2265,
  delivery_fee_pence: 0,
  discount_pence: 0,
  promo_code: null,
  notes: null,
  delivery_address: { line1: "23 Elmbourne Road", city: "London", postcode: "SW17 8JS" },
  placed_at: "2026-11-21T17:29:39.602Z",
  created_at: "2026-11-21T17:29:39.257Z",
  printed_at: null,
  scheduled_for: null,
  prep_time_min: 40,
  locations: { name: "Balham", address: "", phone: "" },
};

describe("forwardStatusPath", () => {
  it("walks a single hop", () => {
    expect(forwardStatusPath("paid", "accepted")).toEqual(["accepted"]);
  });

  it("auto-advances through preparing to reach ready_for_collection", () => {
    expect(forwardStatusPath("accepted", "ready_for_collection")).toEqual(["preparing", "ready_for_collection"]);
  });

  it("auto-advances through preparing to reach out_for_delivery", () => {
    expect(forwardStatusPath("accepted", "out_for_delivery")).toEqual(["preparing", "out_for_delivery"]);
  });

  it("walks the full happy path from paid to ready_for_collection", () => {
    expect(forwardStatusPath("paid", "ready_for_collection")).toEqual(["accepted", "preparing", "ready_for_collection"]);
  });

  it("refuses to move backward", () => {
    expect(forwardStatusPath("ready_for_collection", "accepted")).toBeNull();
  });

  it("never auto-advances into cancelled", () => {
    expect(forwardStatusPath("paid", "cancelled")).toBeNull();
  });

  it("never auto-advances into refunded", () => {
    expect(forwardStatusPath("paid", "refunded")).toBeNull();
  });

  it("returns an empty path when from === to", () => {
    expect(forwardStatusPath("paid", "paid")).toEqual([]);
  });
});

describe("appStatusToBbc / bbcStatusToApp round-trips", () => {
  it("maps ACCEPT for collection and delivery alike", () => {
    expect(appStatusToBbc("preparing", "collection")).toBe("accepted");
    expect(appStatusToBbc("preparing", "delivery")).toBe("accepted");
  });

  it("maps READY per fulfilment", () => {
    expect(appStatusToBbc("ready", "collection")).toBe("ready_for_collection");
    expect(appStatusToBbc("ready", "delivery")).toBe("out_for_delivery");
  });

  it("returns null for an unknown app status", () => {
    expect(appStatusToBbc("bogus", "collection")).toBeNull();
  });

  it("round-trips accepted/preparing -> preparing app status", () => {
    expect(bbcStatusToApp("accepted")).toBe("preparing");
    expect(bbcStatusToApp("preparing")).toBe("preparing");
  });

  it("round-trips ready_for_collection/out_for_delivery -> ready app status", () => {
    expect(bbcStatusToApp("ready_for_collection")).toBe("ready");
    expect(bbcStatusToApp("out_for_delivery")).toBe("ready");
  });
});

describe("a ticket waits for its payment row", () => {
  const PLACED = "2026-11-21T17:29:39.602Z";
  const at = (ms: number) => new Date(PLACED).getTime() + ms;

  it("holds back a just-paid order that has no payment row yet", () => {
    // The real failure: Balham's till polled 178ms after the status flipped,
    // saw no payment, and printed PAID ONLINE on a cash order.
    expect(readyToTicket({ placed_at: PLACED, payments: [] }, at(178))).toBe(false);
  });

  it("releases it as soon as the payment row lands", () => {
    expect(readyToTicket({ placed_at: PLACED, payments: [{ method: "cash" }] }, at(178))).toBe(true);
  });

  it("prints anyway rather than lose the ticket", () => {
    // If a payment row never appears, the kitchen must still get the order.
    expect(readyToTicket({ placed_at: PLACED, payments: [] }, at(PAYMENT_SETTLE_MS + 1))).toBe(true);
  });

  it("does not hold an older order back", () => {
    expect(readyToTicket({ placed_at: PLACED, payments: [] }, at(60_000))).toBe(true);
  });

  it("copes with a single payment object rather than an array", () => {
    expect(readyToTicket({ placed_at: PLACED, payments: { method: "card" } }, at(10))).toBe(true);
  });

  it("falls back to created_at, and prints when there is no timestamp at all", () => {
    expect(readyToTicket({ created_at: PLACED, payments: [] }, at(10))).toBe(false);
    expect(readyToTicket({ payments: [] }, at(10))).toBe(true);
  });

  it("is not fooled by a clock skewed into the future", () => {
    // A placed_at ahead of our clock must not hold the ticket for ever.
    expect(readyToTicket({ placed_at: PLACED, payments: [] }, at(-60_000))).toBe(true);
  });
});

describe("the order's own payment method is what the ticket trusts", () => {
  const PLACED = "2026-11-21T17:29:39.602Z";
  const at = (ms: number) => new Date(PLACED).getTime() + ms;

  it("does not wait at all once the order carries its method", () => {
    // The whole race disappears: there is no instant when the order exists
    // and its payment method does not.
    expect(readyToTicket({ placed_at: PLACED, payment_method: "cash", payments: [] }, at(1))).toBe(true);
  });

  it("still waits when the method is missing and no payment row exists", () => {
    expect(readyToTicket({ placed_at: PLACED, payments: [] }, at(1))).toBe(false);
  });

  it("marks a cash order as cash from the order alone", () => {
    const t = orderToPosJson({ ...BASE, payment_method: "cash", payments: [] } as never, []);
    expect(t.paymentStatus).toBe("cash");
  });

  it("marks a card order as paid from the order alone", () => {
    const t = orderToPosJson({ ...BASE, payment_method: "card", payments: [] } as never, []);
    expect(t.paymentStatus).toBe("paid");
  });

  it("believes the order over a payments row that disagrees", () => {
    // Should never happen, but if it does, the intent recorded at checkout is
    // the one the customer agreed to.
    const t = orderToPosJson({ ...BASE, payment_method: "cash", payments: [{ method: "card" }] } as never, []);
    expect(t.paymentStatus).toBe("cash");
  });

  it("falls back to the payments row before the migration is applied", () => {
    const t = orderToPosJson({ ...BASE, payments: [{ method: "cash" }] } as never, []);
    expect(t.paymentStatus).toBe("cash");
  });
});

describe("the day's order number on the ticket", () => {
  it("sends it when the order has one", () => {
    expect(orderToPosJson({ ...BASE, daily_seq: 7 } as never, []).dailyNumber).toBe(7);
  });

  it("sends 0 before the migration has run, so the till leaves it off", () => {
    expect(orderToPosJson(BASE as never, []).dailyNumber).toBe(0);
  });
});
