"use client";

import { useActionState } from "react";

import type { SegmentSize } from "@/lib/repositories/admin-marketing";
import { IDLE } from "@/lib/admin/validation";
import { createCampaign, sendCampaignAction } from "@/app/admin/_actions/marketing";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Field, Select, SubmitButton, TextInput, Textarea } from "@/components/admin/primitives";

export function CampaignComposer({ segments }: { segments: SegmentSize[] }) {
  const [state, action] = useActionState(createCampaign, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-sand bg-surface p-5">
      <Banner state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign name" htmlFor="name"><TextInput id="name" name="name" defaultValue={state.values?.name} placeholder="June newsletter" /></Field>
        <Field label="Audience" htmlFor="segmentId">
          <Select id="segmentId" name="segmentId" defaultValue="">
            <option value="">All subscribers</option>
            {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject"><TextInput id="subject" name="subject" defaultValue={state.values?.subject} /></Field>
      <Field label="Message" htmlFor="body" hint="Plain text. Blank lines become paragraphs. An unsubscribe link is added automatically.">
        <Textarea id="body" name="body" defaultValue={state.values?.body} className="min-h-40" />
      </Field>
      <div className="flex justify-end"><SubmitButton>Save draft</SubmitButton></div>
    </form>
  );
}

export function SendCampaignButton({ id }: { id: string }) {
  const [state, action] = useActionState(sendCampaignAction, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Send this campaign to all matching subscribers now?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      {state.message && <p className={`mt-1 text-xs ${state.ok === false ? "text-primary" : "text-body"}`}>{state.message}</p>}
    </form>
  );
}
