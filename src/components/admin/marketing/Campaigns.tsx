"use client";

import { useActionState, useState } from "react";

import type { SegmentSize } from "@/lib/repositories/admin-marketing";
import { IDLE } from "@/lib/admin/validation";
import { createCampaign, sendCampaignAction } from "@/app/admin/_actions/marketing";
import { CAMPAIGN_TEMPLATES } from "@/lib/marketing/campaign-templates";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Field, Select, SubmitButton, TextInput, Textarea } from "@/components/admin/primitives";

export function CampaignComposer({ segments }: { segments: SegmentSize[] }) {
  const [state, action] = useActionState(createCampaign, IDLE);
  useActionResult(state);

  // Controlled so a template can fill them. Seeded from the last submission so a
  // failed save does not throw away what was typed.
  const [subject, setSubject] = useState(state.values?.subject ?? "");
  const [body, setBody] = useState(state.values?.body ?? "");
  const [applied, setApplied] = useState<string | null>(null);

  const useTemplate = (id: string) => {
    const t = CAMPAIGN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    // Don't silently discard a part-written email.
    if ((subject.trim() || body.trim()) && !window.confirm("Replace what you've written with this template?")) return;
    setSubject(t.subject);
    setBody(t.body);
    setApplied(t.id);
  };

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

      <div>
        <p className="mb-2 text-xs font-semibold text-text">Start from a template</p>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => useTemplate(t.id)}
              title={t.when}
              className={
                "rounded-md border px-3 py-1.5 text-left text-xs transition-colors " +
                (applied === t.id ? "border-primary bg-primary/5 text-primary" : "border-sand text-body hover:border-primary/40 hover:text-text")
              }
            >
              <span className="block font-semibold">{t.name}</span>
              <span className="block text-[11px] opacity-80">{t.when}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-body">Each one is a draft in the restaurant&apos;s voice. Anything in [square brackets] is for you to fill in before sending.</p>
      </div>

      <Field label="Subject" htmlFor="subject">
        <TextInput id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>

      <Field label="Message" htmlFor="body" hint="Plain text. Blank lines become paragraphs. An unsubscribe link is added automatically.">
        <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-56" />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-body">
          {body.trim() ? `${body.trim().split(/\s+/).length} words` : "Nothing written yet"}
        </p>
        <SubmitButton>Save draft</SubmitButton>
      </div>
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
