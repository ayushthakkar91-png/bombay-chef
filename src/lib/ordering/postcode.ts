/** UK postcode helpers for delivery validation (format + outcode extraction). */

export function normalizePostcode(pc: string): string {
  return (pc ?? "").toUpperCase().replace(/\s+/g, "");
}

/**
 * The outcode (postcode district, e.g. "SW12") of a full UK postcode, or null
 * if the input isn't a valid postcode. The incode is always digit + 2 letters.
 */
export function outcodeOf(pc: string): string | null {
  const n = normalizePostcode(pc);
  const m = n.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  return m ? m[1] : null;
}

export function isValidPostcode(pc: string): boolean {
  return outcodeOf(pc) !== null;
}

/** Pretty form with the single space before the incode, e.g. "SW12 9RG". */
export function formatPostcode(pc: string): string {
  const n = normalizePostcode(pc);
  if (n.length < 5) return n;
  return `${n.slice(0, n.length - 3)} ${n.slice(n.length - 3)}`;
}
