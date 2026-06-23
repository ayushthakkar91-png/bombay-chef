/** Report date-range presets, parsed from the `?days=` query param. */

export type ReportRange = { fromISO: string; toISO: string; days: number; label: string };

export const RANGE_PRESETS = [7, 30, 90, 365];

export function parseRange(days?: string): ReportRange {
  const n = Number(days);
  const d = RANGE_PRESETS.includes(n) ? n : 30;
  const to = new Date();
  const from = new Date(to.getTime() - d * 86400000);
  return {
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
    days: d,
    label: d === 365 ? "Last 12 months" : `Last ${d} days`,
  };
}

/** Inclusive list of `yyyy-mm-dd` (London) days spanning the range, for zero-filled series. */
export function dayBuckets(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const start = new Date(fromISO);
  const end = new Date(toISO);
  const d = new Date(start);
  d.setHours(12, 0, 0, 0);
  while (d <= end) {
    out.push(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
    );
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function londonDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Collapse a long daily series into <= maxPoints buckets (summing values). */
export function condense(series: { label: string; value: number }[], maxPoints = 60): { label: string; value: number }[] {
  if (series.length <= maxPoints) return series;
  const size = Math.ceil(series.length / maxPoints);
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < series.length; i += size) {
    const chunk = series.slice(i, i + size);
    out.push({ label: chunk[0].label, value: chunk.reduce((s, c) => s + c.value, 0) });
  }
  return out;
}
