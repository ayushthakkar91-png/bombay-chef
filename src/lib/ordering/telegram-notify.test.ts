import { describe, it, expect } from "vitest";

import { renderOrderMessage } from "./telegram-notify";

const base = {
  code: "A1B2C3D4",
  status: "paid" as const,
  fulfilment: "delivery",
  subtotal_pence: 2340,
  delivery_fee_pence: 199,
  discount_pence: 0,
  gift_card_pence: 0,
  total_pence: 2539,
  contact_name: "A. Patel",
  contact_phone: "07700 900123",
  notes: null,
  delivery_address: { line1: "14 Balham High Road", city: "London", postcode: "SW12 9AJ" },
  order_items: [{ name: "Lamb Biryani", qty: 1 }],
};

describe("the Telegram order message", () => {
  describe("whether the money has been taken", () => {
    it("says CASH and the amount when it has not", () => {
      // This line said PAID on every order for weeks, cash included, because
      // the order status is "paid" either way. It is the last thing somebody
      // reads before handing food over.
      const text = renderOrderMessage({ ...base, payments: [{ method: "cash" }] });
      expect(text).toContain("CASH");
      expect(text).toContain("£25.39");
      expect(text).not.toContain("💳 PAID");
    });

    it("says PAID for a card order", () => {
      const text = renderOrderMessage({ ...base, payments: [{ method: "card" }] });
      expect(text).toContain("💳 PAID");
      expect(text).not.toContain("CASH");
    });

    it("says PAID when the payment row has not landed yet", () => {
      // Confirmation writes the order and the payment separately. An absent
      // row is a card order mid-flight, not a cash one.
      expect(renderOrderMessage({ ...base, payments: null })).toContain("💳 PAID");
      expect(renderOrderMessage({ ...base, payments: [] })).toContain("💳 PAID");
      expect(renderOrderMessage(base)).toContain("💳 PAID");
    });

    it("reads a single joined row as well as an array", () => {
      // Supabase returns one shape or the other depending on the join, and
      // getting this wrong would quietly fall back to PAID.
      const text = renderOrderMessage({ ...base, payments: { method: "cash" } });
      expect(text).toContain("CASH");
    });
  });

  it("still carries what the kitchen needs", () => {
    const text = renderOrderMessage({ ...base, payments: [{ method: "cash" }] });
    expect(text).toContain("A1B2C3D4");
    expect(text).toContain("1× Lamb Biryani");
    expect(text).toContain("07700 900123");
    expect(text).toContain("SW12 9AJ");
  });

  it("escapes HTML in anything a customer typed", () => {
    // The message is sent with parse_mode HTML; an unescaped name would break
    // the message or inject markup.
    const text = renderOrderMessage({
      ...base,
      contact_name: "<b>Bobby</b> & Co",
      payments: [{ method: "card" }],
    });
    expect(text).toContain("&lt;b&gt;Bobby&lt;/b&gt; &amp; Co");
  });
});
