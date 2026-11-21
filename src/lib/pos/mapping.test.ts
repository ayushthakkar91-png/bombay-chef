import { describe, it, expect } from "vitest";
import { forwardStatusPath, appStatusToBbc, bbcStatusToApp, orderToPosJson } from "./mapping";

/** A minimal live order row, as the till query returns one. */
const BASE = {
  id: "o1",
  code: "30811412",
  payment_method: "cash",
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

describe("how an order is paid comes from the order itself", () => {
  // orders.payment_method is written in the same insert that creates the
  // order and the database refuses an order without it. There is no gap, no
  // waiting, and no third answer.
  it("cash", () => {
    expect(orderToPosJson({ ...BASE, payment_method: "cash" } as never, []).paymentStatus).toBe("cash");
  });

  it("card", () => {
    expect(orderToPosJson({ ...BASE, payment_method: "card" } as never, []).paymentStatus).toBe("paid");
  });

  it("ignores the payments row entirely", () => {
    // Written later than the order, so never the thing to read. This is the
    // 178ms race that printed PAID ONLINE on a cash delivery: with the row
    // missing, the order still says cash.
    const t = orderToPosJson({ ...BASE, payment_method: "cash", payments: [] } as never, []);
    expect(t.paymentStatus).toBe("cash");
  });
});

describe("the day's order number on the ticket", () => {
  it("sends it when the order has one", () => {
    expect(orderToPosJson({ ...BASE, daily_seq: 7 } as never, []).dailyNumber).toBe(7);
  });

  it("sends 0 when it has none, so the till leaves it off", () => {
    expect(orderToPosJson(BASE as never, []).dailyNumber).toBe(0);
  });
});
