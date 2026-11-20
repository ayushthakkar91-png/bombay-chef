/**
 * Find the option a customer chose, even when the id they saved has died.
 *
 * A basket lives in a browser indefinitely, so it outlives the menu it was
 * built from. Rebuilding a branch menu deletes and recreates the option rows:
 * "Regular" is still "Regular" on the same dish at the same price, but under a
 * new id. The saved basket points at the old one, pricing fails, and the
 * customer cannot check out at all — over a change they had no part in.
 *
 * So the id is tried first, and if it is gone we re-find the option by name.
 *
 * Why this cannot be used to pay less (or to order something not on sale):
 *   - the search is scoped to the dish being ordered, so a name shared with
 *     another dish can never cross over;
 *   - an option that is switched off is never matched, by id or by name, and
 *     is never substituted with a different one;
 *   - the price returned is the row's, so a repaired line is charged at
 *     today's price, never one the browser remembers.
 *
 * A dish with no name to recover from fails exactly as it did before.
 */

export type ModifierRow = {
  id: string;
  item_id: string;
  name: string;
  price_delta_pence: number | null;
  is_available?: boolean | null;
};

export function resolveModifier(
  /** Every option belonging to the dishes in this order. */
  rows: ModifierRow[],
  itemId: string,
  modifierId: string,
  /** The name the browser saved, if it sent one. */
  savedName: string | undefined,
): ModifierRow | null {
  const onThisDish = rows.filter((m) => m.item_id === itemId && m.is_available !== false);

  const byId = onThisDish.find((m) => m.id === modifierId);
  if (byId) return byId;

  if (!savedName) return null;
  const wanted = savedName.trim().toLowerCase();
  return onThisDish.find((m) => m.name.trim().toLowerCase() === wanted) ?? null;
}
