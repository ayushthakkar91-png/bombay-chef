"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrder } from "./OrderProvider";

/**
 * Client side-effects for the order tracking page: clears the basket once the
 * order is placed (arriving with ?paid), and polls for status updates by
 * refreshing the server component. While payment is still being confirmed it
 * polls quickly (each refresh also asks Stripe directly — see reconcile.ts), then
 * falls back to a slower poll once the order is live in the kitchen.
 */
export function TrackingControls({ isLive, awaitingPayment = false, paid }: { isLive: boolean; awaitingPayment?: boolean; paid: boolean }) {
  const router = useRouter();
  const { clear, ready } = useOrder();

  useEffect(() => {
    if (paid && ready) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, ready]);

  useEffect(() => {
    if (!isLive && !awaitingPayment) return;
    const id = setInterval(() => router.refresh(), awaitingPayment ? 5000 : 25000);
    return () => clearInterval(id);
  }, [isLive, awaitingPayment, router]);

  return null;
}
