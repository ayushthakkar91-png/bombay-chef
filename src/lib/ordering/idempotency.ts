/**
 * Whether a checkout idempotency key should still answer to an existing order.
 *
 * Pulled out of the checkout action so it can be tested directly: this decision
 * silently lost a real order once (a key from the previous day resumed a
 * finished order, the customer saw a tracking page, the kitchen saw nothing),
 * and a rule that fails that way should not live inline where it cannot be
 * exercised.
 *
 * Two different questions, two different clocks:
 *
 *   - An UNPAID order may still be paid for, so its key stays valid for hours.
 *   - A FINISHED order is done. Its key only exists to absorb a double-click,
 *     which is a matter of seconds — after that, the same basket means the
 *     customer wants another order.
 */

/** How long any key keeps pointing at its order. */
export const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 60 * 1000;

/** How long a completed order keeps answering to its key. */
export const COMPLETED_RESUME_WINDOW_MS = 5 * 60 * 1000;

export type ResumeDecision =
  /** Hand back the existing order (or its payment session). */
  | "resume"
  /** Tell the customer it was cancelled; they must start again. */
  | "cancelled"
  /** Ignore the key and place a new order. */
  | "new";

export function resumeDecision(status: string, ageMs: number): ResumeDecision {
  // Older than the outer window: the key is stale whatever the status.
  if (ageMs > IDEMPOTENCY_WINDOW_MS) return "new";

  // A cancelled or refunded order cannot be resumed OR silently replaced —
  // the customer needs to know, because they may believe it is still coming.
  if (status === "cancelled" || status === "refunded") return "cancelled";

  // Still awaiting payment: resume, so the payment can be completed.
  if (status === "pending_payment") return "resume";

  // Finished. Only a near-instant repeat is a retry.
  return ageMs <= COMPLETED_RESUME_WINDOW_MS ? "resume" : "new";
}
