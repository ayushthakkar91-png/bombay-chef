"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/admin/validation";
import { adjustCustomerPoints } from "@/app/admin/_actions/loyalty";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Button, Field, TextInput } from "@/components/admin/primitives";

export function PointsAdjuster({ customerId }: { customerId: string }) {
  const [state, action] = useActionState(adjustCustomerPoints, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-3 px-5 py-4">
      <Banner state={state} />
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Points (+/−)" htmlFor="delta">
          <TextInput id="delta" name="delta" type="number" placeholder="e.g. 100 or -50" />
        </Field>
        <Field label="Reason" htmlFor="note">
          <TextInput id="note" name="note" placeholder="Goodwill, correction…" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary">Adjust points</Button>
      </div>
    </form>
  );
}
