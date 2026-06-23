"use client";

import { useActionState } from "react";

import type { PreferenceRow } from "@/lib/repositories/messaging";
import { IDLE } from "@/lib/admin/validation";
import { setConsent } from "@/app/admin/_actions/messaging";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Field, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const check = "h-4 w-4 accent-brass";
const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(iso));

export function ConsentPanel({ preferences }: { preferences: PreferenceRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <SetForm />
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Phone</Th><Th className="text-center">SMS</Th><Th className="text-center">WhatsApp</Th><Th className="text-center">Marketing</Th><Th>Updated</Th></tr></thead>
          <tbody className="divide-y divide-sand">
            {preferences.length === 0 ? (
              <tr><Td className="text-body">No preferences captured yet.</Td><Td /><Td /><Td /><Td /></tr>
            ) : preferences.map((p) => (
              <tr key={p.id} className="hover:bg-bg/30">
                <Td className="font-mono text-sm">{p.phone}{p.optedOut && <Badge tone="off">opted out</Badge>}</Td>
                <Cell on={!p.optedOut && p.smsOptIn} />
                <Cell on={!p.optedOut && p.whatsappOptIn} />
                <Cell on={!p.optedOut && p.marketingOptIn} />
                <Td className="text-body">{d(p.updatedAt)}{p.source ? ` · ${p.source}` : ""}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ on }: { on: boolean }) {
  return <Td className="text-center">{on ? <span className="text-emerald-600">✓</span> : <span className="text-body/40">—</span>}</Td>;
}

function SetForm() {
  const [state, action] = useActionState(setConsent, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-4 self-start rounded-lg border border-sand bg-surface p-5">
      <h2 className="text-sm font-semibold text-text">Set preferences</h2>
      <p className="text-xs text-body">Untick everything to opt the number out entirely (GDPR).</p>
      <Banner state={state} />
      <Field label="Phone (E.164)" htmlFor="phone" required><TextInput id="phone" name="phone" placeholder="+447700900123" /></Field>
      <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" name="sms" defaultChecked className={check} /> SMS (transactional)</label>
      <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" name="whatsapp" className={check} /> WhatsApp (transactional)</label>
      <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" name="marketing" className={check} /> Marketing</label>
      <div className="flex justify-end"><SubmitButton>Save</SubmitButton></div>
    </form>
  );
}
