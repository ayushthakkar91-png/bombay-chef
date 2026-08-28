"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";

import { retryOrderNotification } from "@/app/admin/_actions/orders";
import { IDLE } from "@/lib/admin/validation";
import type { NotificationFailure } from "@/lib/repositories/orders";

/**
 * Dashboard alarm: paid orders whose restaurant notification (Telegram/email)
 * hit the dead-letter. Impossible to miss so no order is silently unnotified.
 * The order itself is fine (CONFIRMED in the DB) — only the notification failed.
 */
export function NotificationFailures({ failures, locationId }: { failures: NotificationFailure[]; locationId: string }) {
  if (failures.length === 0) return null;
  return (
    <div className="mb-5 rounded-lg border-2 border-red-500 bg-red-50 p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-red-800">
        <AlertTriangle className="h-5 w-5" />
        🚨 {failures.length} notification{failures.length > 1 ? "s" : ""} failed to deliver
      </div>
      <p className="mb-3 text-sm text-red-700">
        These orders were received and are safe in the system — only the restaurant notification couldn&apos;t be delivered. Check the order, then retry.
      </p>
      <ul className="flex flex-col gap-2">
        {failures.map((f) => (
          <li key={`${f.orderId}-${f.channel}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-white px-3 py-2 text-sm">
            <span className="text-red-900">
              <span className="font-semibold">{f.code}</span> · {f.channel} · {f.attempts} attempts
              {f.lastError ? <span className="ml-2 text-red-500">{f.lastError.slice(0, 80)}</span> : null}
            </span>
            <RetryButton orderId={f.orderId} locationId={locationId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RetryButton({ orderId, locationId }: { orderId: string; locationId: string }) {
  const [state, action, pending] = useActionState(retryOrderNotification, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="locationId" value={locationId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
      {state?.ok === false && <span className="text-xs text-red-600">{state.message}</span>}
      {state?.ok === true && <span className="text-xs text-green-700">Requeued</span>}
    </form>
  );
}
