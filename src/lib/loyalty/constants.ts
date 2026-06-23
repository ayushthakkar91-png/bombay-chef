/** Loyalty rules shared by service, account UI, and admin. */

export type Tier = "bronze" | "silver" | "gold" | "vip";

/** £1 spent = 1 point (earned on net food spend, excluding delivery). */
export function pointsForPence(pence: number): number {
  return Math.floor(Math.max(0, pence) / 100);
}

/** Redemption value: 100 points = £1. */
export const POINTS_PER_POUND = 100;

export const TIERS: { tier: Tier; minLifetime: number }[] = [
  { tier: "bronze", minLifetime: 0 },
  { tier: "silver", minLifetime: 500 },
  { tier: "gold", minLifetime: 2000 },
  { tier: "vip", minLifetime: 5000 },
];

export const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  vip: "VIP",
};

export function tierForLifetime(lifetime: number): Tier {
  let t: Tier = "bronze";
  for (const { tier, minLifetime } of TIERS) if (lifetime >= minLifetime) t = tier;
  return t;
}

export function tierRank(tier: Tier): number {
  return TIERS.findIndex((t) => t.tier === tier);
}

/** Points needed to reach the next tier (null if already top). */
export function nextTier(lifetime: number): { tier: Tier; needed: number } | null {
  for (const { tier, minLifetime } of TIERS) {
    if (lifetime < minLifetime) return { tier, needed: minLifetime - lifetime };
  }
  return null;
}

export const VOUCHER_EXPIRY_DAYS = 60;
export const BIRTHDAY_DISCOUNT_PERCENT = 10;
export const BIRTHDAY_EXPIRY_DAYS = 30;
