"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import type { SegmentSize } from "@/lib/repositories/admin-marketing";
import { IDLE } from "@/lib/admin/validation";
import { createCampaign, sendCampaignAction } from "@/app/admin/_actions/marketing";
import { renderCampaignPreview } from "@/app/admin/_actions/campaign-preview";
import { CAMPAIGN_TEMPLATES } from "@/lib/marketing/campaign-templates";
import { useActionResult } from "@/components/admin/useActionResult";
import { ImageUrlField } from "@/components/admin/ImageUrlField";
import { Banner, Field, Select, SubmitButton, TextInput, Textarea } from "@/components/admin/primitives";

export function CampaignComposer({ segments }: { segments: SegmentSize[] }) {
  const [state, action] = useActionState(createCampaign, IDLE);
  useActionResult(state);

  // Controlled so a template can fill them, and so the preview can follow along.
  // Seeded from the last submission so a failed save does not lose the writing.
  const [subject, setSubject] = useState(state.values?.subject ?? "");
  const [body, setBody] = useState(state.values?.body ?? "");
  const [imageUrl, setImageUrl] = useState(state.values?.imageUrl ?? "");
  const [ctaUrl, setCtaUrl] = useState(state.values?.ctaUrl ?? "");
  const [ctaLabel, setCtaLabel] = useState(state.values?.ctaLabel ?? "");
  const [applied, setApplied] = useState<string | null>(null);

  const useTemplate = (id: string) => {
    const t = CAMPAIGN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    if ((subject.trim() || body.trim()) && !window.confirm("Replace what you've written with this template?")) return;
    setSubject(t.subject);
    setBody(t.body);
    setApplied(t.id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <form action={action} className="flex flex-col gap-4 rounded-lg border border-sand bg-surface p-5">
        <Banner state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign name" htmlFor="name" hint="Internal only — subscribers never see it.">
            <TextInput id="name" name="name" defaultValue={state.values?.name} placeholder="June newsletter" />
          </Field>
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
          <p className="mt-2 text-xs text-body">Anything in [square brackets] is for you to fill in before sending.</p>
        </div>

        <Field label="Subject" htmlFor="subject" hint="What they see in their inbox. Short and specific beats clever.">
          <TextInput id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>

        <Field label="Photograph" htmlFor="imageUrl" hint="Optional, shown above the message. Upload one or paste an https link.">
          <ImageUrlField defaultValue={imageUrl} folder="misc" error={state.errors?.imageUrl} onChange={setImageUrl} />
        </Field>

        <Field label="Message" htmlFor="body" hint="Plain text. Leave a blank line between paragraphs. An unsubscribe link is added automatically.">
          <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-56" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button link" htmlFor="ctaUrl" hint="Optional. Where the button goes.">
            <TextInput id="ctaUrl" name="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://www.bombay-bicycle-chef.com/menu" />
          </Field>
          <Field label="Button text" htmlFor="ctaLabel">
            <TextInput id="ctaLabel" name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="See the menu" />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-body">{body.trim() ? `${body.trim().split(/\s+/).length} words` : "Nothing written yet"}</p>
          <SubmitButton>Save draft</SubmitButton>
        </div>
      </form>

      <CampaignPreview subject={subject} body={body} imageUrl={imageUrl} ctaUrl={ctaUrl} ctaLabel={ctaLabel} />
    </div>
  );
}

/**
 * Shows the campaign as a subscriber will receive it.
 *
 * Rendered by the real email template on the server, not a lookalike built in
 * React — a preview that can drift from what is actually sent is worse than no
 * preview. It lands in a sandboxed iframe so the email's own styles cannot
 * touch the admin panel.
 */
function CampaignPreview({
  subject,
  body,
  imageUrl,
  ctaUrl,
  ctaLabel,
}: {
  subject: string;
  body: string;
  imageUrl: string;
  ctaUrl: string;
  ctaLabel: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    // Debounced: this re-renders on every keystroke otherwise.
    const t = setTimeout(() => {
      start(async () => {
        const r = await renderCampaignPreview({ subject, body, imageUrl, ctaUrl, ctaLabel });
        setHtml(r.html);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [subject, body, imageUrl, ctaUrl, ctaLabel]);

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-semibold text-text">Preview</p>
        <p className="text-xs text-body">{pending ? "updating…" : "as subscribers will see it"}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-sand bg-white">
        {html ? (
          <iframe
            title="Campaign preview"
            srcDoc={html}
            sandbox=""
            className="h-[620px] w-full border-0"
          />
        ) : (
          <div className="flex h-[620px] items-center justify-center p-6 text-center text-sm text-body">
            Start writing and the email appears here.
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-body">
        The unsubscribe link is required by law and is added to every campaign — each subscriber gets their own.
      </p>
    </aside>
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
