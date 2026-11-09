"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { saveDeliveryTiers } from "@/app/admin/_actions/delivery-tiers";
import type { DeliveryTier } from "@/lib/ordering/delivery-tiers";

type Row = { maxMiles: string; fee: string };

const toRows = (tiers: DeliveryTier[]): Row[] =>
  tiers.length
    ? tiers.map((t) => ({ maxMiles: String(t.maxMiles), fee: (t.feePence / 100).toFixed(2) }))
    : [{ maxMiles: "1", fee: "0.00" }];

/**
 * Delivery charge by distance. Each row is "up to this many miles costs this
 * much"; anything past the last row is out of range and the customer is offered
 * collection instead.
 *
 * These bands apply to every branch. A branch can still be more restrictive
 * through its own delivery radius, and "free delivery over £X" always wins.
 */
export function DeliveryTiers({ tiers, canManage }: { tiers: DeliveryTier[]; canManage: boolean }) {
  const [rows, setRows] = useState<Row[]>(toRows(tiers));
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addRow = () => {
    const last = rows[rows.length - 1];
    const nextMiles = last ? Number(last.maxMiles) + 1 : 1;
    setRows([...rows, { maxMiles: String(Number.isFinite(nextMiles) ? nextMiles : 1), fee: "0.00" }]);
  };

  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const save = () => {
    setError(null);
    const parsed = rows.map((r) => ({
      maxMiles: Number(r.maxMiles),
      feePence: Math.round(Number(r.fee) * 100),
    }));
    if (parsed.some((p) => !Number.isFinite(p.maxMiles) || !Number.isFinite(p.feePence))) {
      setError("Check the numbers — miles and charge must both be filled in.");
      return;
    }
    start(async () => {
      const r = await saveDeliveryTiers(parsed);
      if (r.ok) {
        setNote("Saved");
        setTimeout(() => setNote(null), 1800);
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  const sorted = [...rows].sort((a, b) => Number(a.maxMiles) - Number(b.maxMiles));
  const furthest = sorted.length ? sorted[sorted.length - 1].maxMiles : null;

  return (
    <div className="rounded-lg border border-sand bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-text">Delivery charges by distance</p>
          <p className="mt-0.5 text-sm text-body">
            Each band covers everything up to that distance. Past the last band we don&apos;t deliver.
          </p>
        </div>
        {note && <span className="shrink-0 text-sm text-emerald-700">{note}</span>}
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-body">Up to</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={row.maxMiles}
              disabled={!canManage || pending}
              onChange={(e) => set(i, { maxMiles: e.target.value })}
              className="w-20 rounded-md border border-sand bg-white px-2 py-1.5 text-sm text-text disabled:opacity-60"
              aria-label={`Band ${i + 1} distance in miles`}
            />
            <span className="text-sm text-body">miles &rarr;</span>
            <span className="text-sm text-body">£</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={row.fee}
              disabled={!canManage || pending}
              onChange={(e) => set(i, { fee: e.target.value })}
              className="w-24 rounded-md border border-sand bg-white px-2 py-1.5 text-sm text-text disabled:opacity-60"
              aria-label={`Band ${i + 1} charge in pounds`}
            />
            {Number(row.fee) === 0 && <span className="text-xs text-emerald-700">free</span>}
            {canManage && rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={pending}
                className="rounded-md p-1.5 text-body hover:bg-sand/40 hover:text-text"
                aria-label={`Remove band ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {furthest && (
        <p className="mt-3 text-xs text-body/80">
          Anyone more than {furthest} miles away is told we don&apos;t deliver that far, and is offered collection.
          A branch with a smaller delivery radius stays limited to its own radius, and &ldquo;free delivery over £X&rdquo;
          still makes delivery free at any distance.
        </p>
      )}

      {canManage && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-sand px-3 py-1.5 text-sm text-text hover:bg-sand/40"
          >
            <Plus className="h-4 w-4" /> Add band
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-text px-4 py-1.5 text-sm text-surface hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save charges"}
          </button>
        </div>
      )}
    </div>
  );
}
