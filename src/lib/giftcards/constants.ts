/** Gift card amounts (pence) and bounds for custom values. */
export const GIFT_PRESETS_PENCE = [2500, 5000, 10000, 20000];
export const GIFT_MIN_PENCE = 1000; // £10
export const GIFT_MAX_PENCE = 50000; // £500

export function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
