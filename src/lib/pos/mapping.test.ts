import { describe, it, expect } from "vitest";
import { forwardStatusPath, appStatusToBbc, bbcStatusToApp } from "./mapping";

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
