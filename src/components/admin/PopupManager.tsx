"use client";

import { useActionState } from "react";

import type { EventPopupConfig } from "@/config/event-popup";
import { IDLE } from "@/lib/admin/validation";
import { updatePopup } from "@/app/admin/_actions/popup";
import { ImageUrlField } from "./ImageUrlField";
import { Banner, Field, SubmitButton, TextInput, Textarea } from "./primitives";

export function PopupManager({
  config,
  canManage,
}: {
  config: EventPopupConfig;
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(updatePopup, IDLE);

  if (!canManage) {
    return (
      <div className="rounded-lg border border-sand bg-surface p-6 text-sm text-body">
        You don’t have permission to edit the offers pop-up. Ask a manager for access.
      </div>
    );
  }

  // After a failed submit, repopulate from the echoed values; otherwise show
  // the currently-saved config.
  const v = (name: string, fallback?: string) => state.values?.[name] ?? fallback ?? "";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <Banner state={state} />

      {/* Enabled toggle */}
      <label className="flex items-center gap-3 rounded-lg border border-sand bg-surface px-4 py-3">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={config.enabled}
          className="h-4 w-4 rounded border-sand text-primary focus-visible:ring-2 focus-visible:ring-brass"
        />
        <span className="text-sm font-medium text-text">
          Show the pop-up on the site
          <span className="ml-2 font-normal text-body">Uncheck to hide it entirely.</span>
        </span>
      </label>

      <Field label="Kicker label" htmlFor="label" hint="Small text above the title, e.g. “This week only”.">
        <TextInput id="label" name="label" defaultValue={v("label", config.label)} placeholder="This week only" />
      </Field>

      <Field label="Title" htmlFor="title" required error={state.errors?.title}>
        <TextInput id="title" name="title" defaultValue={v("title", config.title)} placeholder="Live Football at Balham" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Offer headline" htmlFor="offerHeadline" hint="The big line — change the percentage here.">
          <TextInput id="offerHeadline" name="offerHeadline" defaultValue={v("offerHeadline", config.offerHeadline)} placeholder="Get 25% Off" />
        </Field>
        <Field label="Offer sub-label" htmlFor="offer" hint="Small line under the headline.">
          <TextInput id="offer" name="offer" defaultValue={v("offer", config.offer)} placeholder="On Takeaway Orders" />
        </Field>
      </div>

      <Field label="Message" htmlFor="message" hint="Supporting sentence shown below the offer.">
        <Textarea id="message" name="message" defaultValue={v("message", config.message)} placeholder="Watch the match with us over food, drinks and Bombay atmosphere." />
      </Field>

      {/* Optional image */}
      <ImageUrlField defaultValue={state.values?.imageUrl ?? config.image ?? ""} error={state.errors?.imageUrl} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Primary button text" htmlFor="ctaText" required error={state.errors?.ctaText}>
          <TextInput id="ctaText" name="ctaText" defaultValue={v("ctaText", config.ctaText)} placeholder="Reserve a Table" />
        </Field>
        <Field label="Primary button link" htmlFor="ctaHref" required error={state.errors?.ctaHref}>
          <TextInput id="ctaHref" name="ctaHref" defaultValue={v("ctaHref", config.ctaHref)} placeholder="/reservations?location=balham" />
        </Field>
        <Field label="Secondary button text" htmlFor="secondaryText">
          <TextInput id="secondaryText" name="secondaryText" defaultValue={v("secondaryText", config.secondaryText)} placeholder="View Menu" />
        </Field>
        <Field label="Secondary button link" htmlFor="secondaryHref">
          <TextInput id="secondaryHref" name="secondaryHref" defaultValue={v("secondaryHref", config.secondaryHref)} placeholder="/menu" />
        </Field>
      </div>

      <Field label="Footnote" htmlFor="note" hint="Tiny reassurance line under the buttons.">
        <TextInput id="note" name="note" defaultValue={v("note", config.note)} placeholder="Tables are limited" />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>Save popup</SubmitButton>
      </div>
    </form>
  );
}
