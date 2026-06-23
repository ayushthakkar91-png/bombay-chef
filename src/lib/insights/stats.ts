import type { Confidence, ConfLevel, Delta } from "./types";

/** Confidence from sample size — more data, higher confidence (saturating). */
export function confidence(n: number, basisNoun = "data points"): Confidence {
  const score = Math.max(10, Math.min(95, Math.round((100 * n) / (n + 10))));
  return { score, level: levelFor(score), basis: `${n} ${basisNoun}` };
}

export function confidenceFrom(score: number, basis: string): Confidence {
  const s = Math.max(5, Math.min(98, Math.round(score)));
  return { score: s, level: levelFor(s), basis };
}

function levelFor(score: number): ConfLevel {
  return score < 50 ? "low" : score < 75 ? "medium" : "high";
}

export function delta(current: number, previous: number): Delta {
  const pct = previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / previous) * 100);
  const direction = current > previous * 1.01 ? "up" : current < previous * 0.99 ? "down" : "flat";
  return { current, previous, pct, direction };
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Ordinary least-squares on (index, value). Returns slope, intercept and R². */
export function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const xs = values.map((_, i) => i);
  const mx = mean(xs), my = mean(values);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (values[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (values[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

/** Project `ahead` future points from a series using its linear trend. */
export function projectLinear(values: number[], ahead: number): { projection: number[]; r2: number; slope: number } {
  const { slope, intercept, r2 } = linearRegression(values);
  const n = values.length;
  const projection = Array.from({ length: ahead }, (_, k) => Math.max(0, Math.round(intercept + slope * (n + k))));
  return { projection, r2, slope };
}
