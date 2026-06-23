"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import type { Campaign } from "@/lib/repositories/messaging";
import { IDLE } from "@/lib/admin/validation";
import { saveCampaign, sendCampaignAction } from "@/app/admin/_actions/messaging";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const tone = (s: string) => (s === "sent" ? "on" : s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export function CampaignsManager({ campaigns }: { campaigns: Campaign[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New campaign</Button></div>
      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns" description="Create a marketing SMS/WhatsApp campaign. It only sends to opted-in recipients." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New campaign</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Campaign</Th><Th>Channel</Th><Th>Message</Th><Th className="text-right">Sent to</Th><Th>Status</Th><Th>Created</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{c.name}</Td>
                  <Td className="uppercase text-body">{c.channel}</Td>
                  <Td className="max-w-xs truncate text-sm text-body">{c.body}</Td>
                  <Td className="text-right tabular-nums">{c.status === "sent" ? c.totalCount : "—"}</Td>
                  <Td><Badge tone={tone(c.status)}>{c.status}</Badge></Td>
                  <Td className="text-body">{d(c.createdAt)}</Td>
                  <Td className="text-right">{c.status === "draft" && <SendButton id={c.id} />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New campaign" description="Sends only to recipients with marketing consent."><CreateForm onDone={() => setOpen(false)} /></Modal>
    </>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState(saveCampaign, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}><TextInput id="name" name="name" defaultValue={state.values?.name} /></Field>
        <Field label="Channel" htmlFor="channel"><Select id="channel" name="channel" defaultValue="sms"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></Select></Field>
      </div>
      <Field label="Message" htmlFor="body" required error={state.errors?.body} hint="Add a link below to track clicks."><Textarea id="body" name="body" rows={4} /></Field>
      <Field label="Link (optional)" htmlFor="linkUrl" hint="Tracked per recipient."><TextInput id="linkUrl" name="linkUrl" type="url" placeholder="https://…" /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>Create draft</SubmitButton></div>
    </form>
  );
}

function SendButton({ id }: { id: string }) {
  const [state, action] = useActionState(sendCampaignAction, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Send this campaign to all opted-in recipients?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="Queuing…">Send</SubmitButton>
    </form>
  );
}
