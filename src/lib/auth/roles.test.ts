import { describe, it, expect } from "vitest";

import { ROLE_RANK, roleAtLeast, topRank, type StaffGrant } from "./roles";

const BALHAM = "11111111-1111-1111-1111-111111111111";
const TOOTING = "22222222-2222-2222-2222-222222222222";

// A kitchen terminal account: staff, scoped to one branch.
const branchStaff: StaffGrant[] = [{ role: "staff", locationId: BALHAM }];
const orgWideStaff: StaffGrant[] = [{ role: "staff", locationId: null }];

describe("role checks", () => {
  it("does NOT accept a branch-scoped grant when no location is given", () => {
    // This is the trap that locked every branch-scoped staff account out of the
    // POS login: with no location to compare against, only org-wide grants pass.
    expect(roleAtLeast(branchStaff, "staff")).toBe(false);
    expect(roleAtLeast(orgWideStaff, "staff")).toBe(true);
  });

  it("accepts a branch-scoped grant for its own branch, and rejects another", () => {
    expect(roleAtLeast(branchStaff, "staff", BALHAM)).toBe(true);
    expect(roleAtLeast(branchStaff, "staff", TOOTING)).toBe(false);
  });

  it("lets an org-wide grant satisfy any branch", () => {
    expect(roleAtLeast(orgWideStaff, "staff", TOOTING)).toBe(true);
  });

  it("topRank ignores location, which is what the POS login gate needs", () => {
    // posLogin only decides "is this a staff member at all" — the branch check
    // happens per request in verifyPosRequest().
    expect(topRank(branchStaff)).toBeGreaterThanOrEqual(ROLE_RANK.staff);
    expect(topRank(orgWideStaff)).toBeGreaterThanOrEqual(ROLE_RANK.staff);
    expect(topRank([])).toBe(0);
  });

  it("keeps rank ordering: a manager clears the staff bar, staff do not clear manager", () => {
    const manager: StaffGrant[] = [{ role: "location_manager", locationId: BALHAM }];
    expect(roleAtLeast(manager, "staff", BALHAM)).toBe(true);
    expect(roleAtLeast(branchStaff, "location_manager", BALHAM)).toBe(false);
  });
});
