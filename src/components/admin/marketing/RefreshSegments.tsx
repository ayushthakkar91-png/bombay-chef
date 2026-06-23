"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";

import { IDLE } from "@/lib/admin/validation";
import { refreshSegments } from "@/app/admin/_actions/marketing";
import { useActionResult } from "@/components/admin/useActionResult";
import { SubmitButton } from "@/components/admin/primitives";

export function RefreshSegments() {
  const [state, action] = useActionState(() => refreshSegments(), IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant="secondary" pendingLabel="Recomputing…">
        <RefreshCw className="h-4 w-4" /> Refresh now
      </SubmitButton>
      {state.message && <span className="text-sm text-body">{state.message}</span>}
    </form>
  );
}
