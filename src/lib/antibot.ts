/**
 * Invisible bot checks for public forms.
 *
 * No puzzle, no checkbox, nothing a real customer ever sees. Two signals that
 * ordinary form-spam bots give away for free:
 *
 *   - a honeypot field, hidden from people but filled in by anything that walks
 *     the DOM and completes every input it finds;
 *   - how long the form was on screen, because a bot posts in milliseconds and
 *     a person cannot type a name, an email and a message in under three
 *     seconds.
 *
 * Neither is proof. Both are cheap, and together they stop the bulk of the
 * automated submissions that fill the enquiries inbox. Anything determined
 * enough to defeat them needs a real challenge (Turnstile), which costs every
 * genuine customer a little friction — so this is the first line, not the last.
 */

/** Name of the hidden field. Deliberately boring, so it reads as a real one. */
export const HONEYPOT_FIELD = "company_website";

/** Hidden field holding when the form was rendered, as epoch milliseconds. */
export const RENDERED_AT_FIELD = "form_rendered_at";

/** Minimum time a human plausibly needs. */
const MIN_SECONDS = 3;

/** Longest a form may sit open before we stop trusting the timestamp. */
const MAX_HOURS = 12;

export type BotSignals = {
  /** Value of the honeypot field, if the form sent one. */
  honeypot?: string | null;
  /** Value of the rendered-at field, if the form sent one. */
  renderedAt?: string | number | null;
};

/**
 * Why this submission looks automated, or null when it looks human.
 *
 * The reason is for logs only — never show it to the sender. Telling a bot
 * which check it failed is how it learns to pass.
 */
export function automatedReason(signals: BotSignals, minSeconds = MIN_SECONDS): string | null {
  const pot = typeof signals.honeypot === "string" ? signals.honeypot.trim() : "";
  if (pot) return "honeypot filled";

  const raw = signals.renderedAt;
  if (raw == null || raw === "") return null; // not sent: an older cached page, so judge it on the honeypot alone

  const started = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(started) || started <= 0) return "unreadable timestamp";

  const elapsedMs = Date.now() - started;
  if (elapsedMs < 0) return "timestamp in the future";
  if (elapsedMs < minSeconds * 1000) return `submitted after ${Math.round(elapsedMs / 100) / 10}s`;
  if (elapsedMs > MAX_HOURS * 3600 * 1000) return "stale form";

  return null;
}
