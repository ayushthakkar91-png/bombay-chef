"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrder } from "./OrderProvider";

/**
 * Client side-effects for the order tracking page: clears the basket once the
 * order is placed (arriving with ?paid), and polls for status updates while the
 * order is still live by refreshing the server component.
 */
export function TrackingControls({ isLive, paid }: { isLive: boolean; paid: boolean }) {
  const router = useRouter();
  const { clear, ready } = useOrder();

  useEffect(() => {
    if (paid && ready) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, ready]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => router.refresh(), 25000);
    return () => clearInterval(id);
  }, [isLive, router]);

  return null;
}
