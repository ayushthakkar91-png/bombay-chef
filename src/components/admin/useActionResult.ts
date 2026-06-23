"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/admin/validation";

/**
 * Reacts to a Server Action's result returned via `useActionState`. On a fresh
 * success it refreshes the route (re-running the Server Component that fetched
 * the data, so revalidated rows appear) and fires `onSuccess` (e.g. close a
 * modal). Deduped by state-object identity so it runs once per action result —
 * which also makes it safe for `onSuccess` to be an inline closure.
 */
export function useActionResult(state: ActionState, onSuccess?: () => void) {
  const router = useRouter();
  const seen = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state?.ok) {
      router.refresh();
      onSuccess?.();
    }
  }, [state, router, onSuccess]);
}
