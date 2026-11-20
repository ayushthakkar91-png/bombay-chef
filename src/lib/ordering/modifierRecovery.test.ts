import { describe, it, expect } from "vitest";

import { resolveModifier } from "./modifierRecovery";

/** Plain Rice's options as the database has them today, after a rebuild. */
const options = [
  { id: "opt-reg-new", item_id: "rice", name: "Regular", price_delta_pence: 0, is_available: true },
  { id: "opt-lrg-new", item_id: "rice", name: "Large", price_delta_pence: 200, is_available: true },
  { id: "opt-sml-gone", item_id: "rice", name: "Small", price_delta_pence: 0, is_available: false },
  { id: "opt-other", item_id: "naan", name: "Regular", price_delta_pence: 0, is_available: true },
];

describe("recovering an option whose id no longer exists", () => {
  it("uses the id when it is still good", () => {
    const got = resolveModifier(options, "rice", "opt-lrg-new", "Large");
    expect(got?.id).toBe("opt-lrg-new");
  });

  it("recovers by name after a menu rebuild changed the ids", () => {
    // This is the failure that stopped customers checking out: same dish,
    // same option, same price, dead id.
    const got = resolveModifier(options, "rice", "opt-reg-OLD", "Regular");
    expect(got?.id).toBe("opt-reg-new");
    expect(got?.price_delta_pence).toBe(0);
  });

  it("never crosses to another dish", () => {
    // "Regular" exists on the naan too. Matching it would put a naan's option
    // on a rice order — the server must only ever look within the dish being
    // ordered.
    const got = resolveModifier(options, "rice", "missing", "Regular");
    expect(got?.item_id).toBe("rice");
  });

  it("refuses an option that has been withdrawn", () => {
    // "Small" is off the menu. Substituting Regular would charge for
    // something the customer did not choose.
    expect(resolveModifier(options, "rice", "opt-sml-gone", "Small")).toBeNull();
  });

  it("refuses when there is no name to recover from", () => {
    // An older page that does not send names yet. It fails the way it always
    // did, rather than guessing.
    expect(resolveModifier(options, "rice", "missing", undefined)).toBeNull();
  });

  it("refuses a name that is not on this dish at all", () => {
    expect(resolveModifier(options, "rice", "missing", "Extra chilli")).toBeNull();
  });

  it("ignores case and stray spaces in the name", () => {
    expect(resolveModifier(options, "rice", "missing", "  regular ")?.id).toBe("opt-reg-new");
  });

  it("takes the database price, never one the browser remembers", () => {
    // The browser's basket says Large cost £2.00. The menu says £2.50 today.
    const dearer = [{ ...options[1], price_delta_pence: 250 }];
    expect(resolveModifier(dearer, "rice", "dead-id", "Large")?.price_delta_pence).toBe(250);
  });
});
