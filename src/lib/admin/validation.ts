/**
 * Tiny, dependency-free form validation for admin Server Actions. (We avoid a
 * runtime dep here so Phase 1 builds with zero new installs; the architecture
 * recommends Zod once it's added to package.json.)
 *
 * `ActionState` is the shape returned to `useActionState` in the client forms.
 */

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echo of submitted values so the form can repopulate after an error. */
  values?: Record<string, string>;
};

export const IDLE: ActionState = {};

export function ok(message: string): ActionState {
  return { ok: true, message };
}

export function fail(
  message: string,
  errors?: Record<string, string>,
  values?: Record<string, string>,
): ActionState {
  return { ok: false, message, errors, values };
}

export function str(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export function bool(form: FormData, name: string): boolean {
  const v = form.get(name);
  return v === "on" || v === "true" || v === "1";
}

/** Parsed integer, or `null` if blank/invalid. */
export function intOrNull(form: FormData, name: string): number | null {
  const raw = str(form, name);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function strList(form: FormData, name: string): string[] {
  return form.getAll(name).map((v) => String(v)).filter(Boolean);
}

/**
 * Parse a "£11.55" / "11.55" / "11" price string into integer pence, or `null`
 * if blank, or `NaN` sentinel via the second return for "present but invalid".
 */
export function parsePence(input: string): { pence: number | null; invalid: boolean } {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (cleaned === "") return { pence: null, invalid: false };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { pence: null, invalid: true };
  return { pence: Math.round(parseFloat(cleaned) * 100), invalid: false };
}

/** Format integer pence back to a "£11.55" display string. */
export function formatPence(pence: number | null | undefined): string {
  if (pence == null) return "";
  return `£${(pence / 100).toFixed(2)}`;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isSlug(s: string): boolean {
  return SLUG_RE.test(s);
}
