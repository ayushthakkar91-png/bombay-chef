"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";

import { IDLE } from "@/lib/admin/validation";
import { runMessagingNow } from "@/app/admin/_actions/messaging";
import { useActionResult } from "@/components/admin/useActionResult";
import { SubmitButton } from "@/components/admin/primitives";

export function RunNowButton() {
  const [state, action] = useActionState(runMessagingNow, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant="secondary" pendingLabel="Running…"><RefreshCw className="h-4 w-4" /> Run queue now</SubmitButton>
      {state.ok && state.message && <span className="text-sm text-body">{state.message}</span>}
    </form>
  );
}
