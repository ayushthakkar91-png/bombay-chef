"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, as a value a component can render.
 *
 * The clock is external state, not something React owns, so it is read rather
 * than copied into state from an effect — which is both what the lint rule
 * objects to and the reason a "how long has this order been waiting" number
 * used to need a render pass to appear.
 *
 * On the server it reads null. A wait measured against the server's clock and
 * then re-measured against the viewer's hydrates to a different number, and a
 * kitchen screen that flickers from "3m" to "4m" on load invites someone to
 * wonder which one is true.
 */

const TICK_MS = 30_000;

let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  // First subscriber starts the clock, last one stops it. One interval for the
  // page however many components ask the time.
  if (timer === null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((fn) => fn());
    }, TICK_MS);
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const snapshot = () => current;
const serverSnapshot = () => null;

/** Milliseconds since the epoch, re-read every 30 seconds. Null until mounted. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
