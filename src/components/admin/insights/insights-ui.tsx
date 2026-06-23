import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Sparkles, ArrowRight } from "lucide-react";

import type { Alert, Confidence, Delta, Forecast, Insight, Recommendation } from "@/lib/insights/types";
import { BarChart } from "@/components/admin/reports/charts";
import { cx } from "@/components/admin/primitives";

const CONF_TONE: Record<string, string> = { high: "bg-emerald-50 text-emerald-700 border-emerald-200", medium: "bg-amber-50 text-amber-700 border-amber-200", low: "bg-sand/60 text-body border-sand" };

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span title={confidence.basis} className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", CONF_TONE[confidence.level])}>
      {confidence.score}% confidence
    </span>
  );
}

export function DeltaPill({ delta, format }: { delta: Delta; format?: (n: number) => string }) {
  const fmt = format ?? ((n: number) => String(n));
  const Icon = delta.direction === "up" ? TrendingUp : delta.direction === "down" ? TrendingDown : Minus;
  const tone = delta.direction === "up" ? "text-emerald-600" : delta.direction === "down" ? "text-primary" : "text-body";
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums text-text">{fmt(delta.current)}</div>
      <div className={cx("mt-0.5 flex items-center gap-1 text-xs font-medium", tone)}>
        <Icon className="h-3.5 w-3.5" />
        {delta.pct == null ? "new" : `${delta.pct > 0 ? "+" : ""}${delta.pct}%`}
        <span className="font-normal text-body">vs prior · {fmt(delta.previous)}</span>
      </div>
    </div>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  const dot = insight.tone === "good" ? "bg-emerald-500" : insight.tone === "bad" ? "bg-primary" : "bg-brass";
  return (
    <div className="rounded-lg border border-sand bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">{insight.title}</p>
          <p className="mt-0.5 text-sm text-body">{insight.detail}</p>
          {insight.confidence && <div className="mt-2"><ConfidenceBadge confidence={insight.confidence} /></div>}
        </div>
      </div>
    </div>
  );
}

const CAT_LABEL: Record<string, string> = { marketing: "Marketing", pricing: "Pricing", inventory: "Inventory", staff: "Staffing" };

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-sand bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brass"><Lightbulb className="h-3.5 w-3.5" /> {CAT_LABEL[rec.category] ?? rec.category}</span>
        <ConfidenceBadge confidence={rec.confidence} />
      </div>
      <p className="text-sm font-semibold text-text">{rec.title}</p>
      <p className="text-sm text-body"><span className="font-medium text-text">Why:</span> {rec.rationale}</p>
      <p className="flex items-start gap-1.5 text-sm text-body"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" /> {rec.action}</p>
      {rec.impact && <p className="text-xs font-medium text-emerald-700">{rec.impact}</p>}
    </div>
  );
}

const SEV_TONE: Record<string, string> = { critical: "border-primary/30 bg-primary/5 text-primary", warning: "border-amber-300 bg-amber-50 text-amber-800", info: "border-sand bg-bg/40 text-body" };

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">No alerts — everything looks healthy. 👍</div>;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} className={cx("flex items-start gap-2.5 rounded-lg border px-4 py-3", SEV_TONE[a.severity])}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="text-sm font-semibold">{a.title}</p><p className="text-sm opacity-90">{a.detail}</p></div>
        </div>
      ))}
    </div>
  );
}

export function ForecastPanel({ forecast, format }: { forecast: Forecast; format: (n: number) => string }) {
  const combined = [...forecast.history, ...forecast.projection];
  return (
    <div className="rounded-lg border border-sand bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text"><Sparkles className="h-4 w-4 text-brass" /> Forecast · {forecast.label}</h3>
        <ConfidenceBadge confidence={forecast.confidence} />
      </div>
      <BarChart data={combined} format={format} />
      <p className="mt-3 text-sm text-body">{forecast.summary}</p>
      <p className="mt-1 text-xs text-body/70">Solid bars = history, the trailing bars = projection. Basis: {forecast.confidence.basis}.</p>
    </div>
  );
}
