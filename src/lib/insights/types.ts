/** Shared types for the BI engine. Everything is computed from real data and
 *  carries an explanation + a confidence score, per the Phase 12 brief. */

export type ConfLevel = "low" | "medium" | "high";
export type Confidence = { score: number; level: ConfLevel; basis: string };

/** A current-vs-prior comparison (historical comparison requirement). */
export type Delta = { current: number; previous: number; pct: number | null; direction: "up" | "down" | "flat" };

export type Insight = { id: string; title: string; detail: string; confidence?: Confidence; tone?: "good" | "bad" | "neutral" };

export type Recommendation = {
  id: string;
  category: "marketing" | "pricing" | "inventory" | "staff";
  title: string;
  rationale: string;   // the "why", citing the numbers
  action: string;      // what to do
  impact?: string;     // estimated upside
  confidence: Confidence;
};

export type Alert = { id: string; title: string; detail: string; severity: "critical" | "warning" | "info"; metric?: string };

export type Forecast = {
  label: string;
  history: { label: string; value: number }[];
  projection: { label: string; value: number }[];
  summary: string;
  confidence: Confidence;
};
