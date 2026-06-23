import { type ReactNode } from "react";

/** Vertical bar chart for a time series. Pure CSS, no dependency. */
export function BarChart({
  data,
  format = (n) => String(n),
  height = 180,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="mb-1 text-xs text-body/70">Peak {format(max)}</div>
      <div className="flex items-end gap-px overflow-x-auto" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex min-w-[6px] flex-1 items-end" title={`${d.label}: ${format(d.value)}`}>
            <div
              className="w-full rounded-t-sm bg-brass/70 transition-colors group-hover:bg-brass"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[11px] text-body/70">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars, e.g. top dishes / top customers. */
export function BarList({
  items,
  format = (n) => String(n),
}: {
  items: { label: string; value: number; sub?: string }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="px-5 py-4 text-sm text-body">No data for this period.</p>;
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li key={i} className="relative flex items-center justify-between gap-4 px-5 py-2.5">
          <div className="absolute inset-y-1 left-0 rounded-r bg-brass/10" style={{ width: `${(it.value / max) * 100}%` }} />
          <span className="relative truncate text-sm text-text">{it.label}{it.sub && <span className="ml-2 text-xs text-body">{it.sub}</span>}</span>
          <span className="relative shrink-0 text-sm font-medium tabular-nums text-text">{format(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Horizontal stacked proportion bar (e.g. collection vs delivery). */
export function StackedBar({ segments }: { segments: { label: string; value: number }[] }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const tones = ["bg-primary", "bg-brass", "bg-[#3a6b2e]", "bg-body"];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((s, i) => (
          <div key={i} className={tones[i % tones.length]} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-body">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${tones[i % tones.length]}`} />
            {s.label} · {s.value} ({Math.round((s.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

/** Simple labelled metric row for report tables. */
export function DataRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 text-sm">
      <span className="text-body">{label}</span>
      <span className="font-medium tabular-nums text-text">{value}</span>
    </div>
  );
}
