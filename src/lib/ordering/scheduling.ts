/**
 * When a scheduled order becomes the kitchen's problem.
 *
 * An order placed at six o'clock for half past eight must not print at six.
 * A ticket on the rail gets cooked, and food that sat for two hours under a
 * lamp is worse than no food. So a scheduled order is held back and released
 * an hour before its slot — long enough to shop the order, short enough that
 * nobody starts it too early.
 *
 * Pure and exported so the rule is stated once and tested, rather than living
 * as a magic number inside two different queries.
 */

/** How long before a scheduled slot its ticket reaches the kitchen. */
export const PRINT_LEAD_MS = 60 * 60 * 1000;

/**
 * Should this order print now?
 *
 * An ASAP order (no slot) always prints immediately — that is every normal
 * order, and nothing about scheduling may slow it down.
 */
export function readyToPrint(scheduledFor: string | null | undefined, now: Date = new Date()): boolean {
  if (!scheduledFor) return true;
  const at = new Date(scheduledFor).getTime();
  // An unreadable timestamp must not strand an order: print it and let a
  // human sort it out, rather than hold it back for ever.
  if (Number.isNaN(at)) return true;
  return now.getTime() >= at - PRINT_LEAD_MS;
}

/**
 * The cutoff, as an ISO string, for use in a database query:
 *   scheduled_for <= releaseCutoff(now)
 */
export function releaseCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() + PRINT_LEAD_MS).toISOString();
}
