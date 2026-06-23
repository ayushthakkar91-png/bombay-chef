"use client";

import { useActionState } from "react";

import type { AdminPromo } from "@/lib/repositories/admin-marketing";
import { IDLE } from "@/lib/admin/validation";
import { createPromo, togglePromo } from "@/app/admin/_actions/marketing";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

function valueLabel(kind: string, value: number): string {
  if (kind === "percent") return `${value}% off`;
  if (kind === "fixed") return `£${(value / 100).toFixed(2)} off`;
  if (kind === "free_delivery") return "Free delivery";
  return "—";
}

export function Promotions({ promos }: { promos: AdminPromo[] }) {
  return (
    <div className="flex flex-col gap-6">
      <CreatePromo />
      {promos.length === 0 ? (
        <p className="text-sm text-body">No discount codes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr><Th>Code</Th><Th>Discount</Th><Th>Min spend</Th><Th className="text-right">Used</Th><Th className="text-center">Active</Th><Th className="w-px" /></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {promos.map((p) => (
                <tr key={p.id} className="hover:bg-bg/30">
                  <Td><code className="rounded bg-bg px-1.5 py-0.5 text-xs">{p.code}</code></Td>
                  <Td>{valueLabel(p.kind, p.value)}</Td>
                  <Td className="text-body">{p.minSpendPence ? `£${(p.minSpendPence / 100).toFixed(2)}` : "—"}</Td>
                  <Td className="text-right tabular-nums text-body">{p.usedCount}{p.globalLimit != null ? ` / ${p.globalLimit}` : ""}</Td>
                  <Td className="text-center"><Badge tone={p.isActive ? "on" : "off"}>{p.isActive ? "Active" : "Off"}</Badge></Td>
                  <Td className="text-right"><TogglePromo id={p.id} active={p.isActive} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreatePromo() {
  const [state, action] = useActionState(createPromo, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="rounded-lg border border-sand bg-surface p-5">
      <Banner state={state} />
      <div className="mt-2 grid gap-4 sm:grid-cols-5 sm:items-end">
        <Field label="Code" htmlFor="code" error={state.errors?.code}><TextInput id="code" name="code" placeholder="SUMMER10" defaultValue={state.values?.code} className="uppercase" /></Field>
        <Field label="Type" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue="percent">
            <option value="percent">% off</option>
            <option value="fixed">£ off</option>
            <option value="free_delivery">Free delivery</option>
          </Select>
        </Field>
        <Field label="Value" htmlFor="value" error={state.errors?.value} hint="% or £"><TextInput id="value" name="value" defaultValue={state.values?.value} placeholder="10" /></Field>
        <Field label="Min spend £" htmlFor="minSpend"><TextInput id="minSpend" name="minSpend" defaultValue={state.values?.minSpend} placeholder="0" /></Field>
        <Field label="Total uses" htmlFor="globalLimit" hint="Blank = ∞"><TextInput id="globalLimit" name="globalLimit" type="number" /></Field>
      </div>
      <div className="mt-3 flex justify-end"><SubmitButton>Create code</SubmitButton></div>
    </form>
  );
}

function TogglePromo({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(togglePromo, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={active ? "false" : "true"} />
      <Button type="submit" variant="ghost">{active ? "Deactivate" : "Activate"}</Button>
    </form>
  );
}
