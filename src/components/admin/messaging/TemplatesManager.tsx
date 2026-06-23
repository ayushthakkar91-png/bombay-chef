"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import type { Template } from "@/lib/repositories/messaging";
import { CHANNEL_LABEL, CATEGORY_LABEL, type Channel, type Category } from "@/lib/messaging/constants";
import { IDLE } from "@/lib/admin/validation";
import { saveTemplate } from "@/app/admin/_actions/messaging";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export function TemplatesManager({ templates }: { templates: Template[] }) {
  const [editing, setEditing] = useState<Template | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Template</Th><Th>Category</Th><Th>Channel</Th><Th>Preview</Th><Th className="text-center">Active</Th><Th className="w-px" /></tr></thead>
          <tbody className="divide-y divide-sand">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-bg/30">
                <Td className="font-medium">{t.name}<div className="font-mono text-xs text-body">{t.key}</div></Td>
                <Td><Badge tone="neutral">{CATEGORY_LABEL[t.category as Category] ?? t.category}</Badge></Td>
                <Td className="text-body">{CHANNEL_LABEL[t.channel as Channel] ?? t.channel}</Td>
                <Td className="max-w-md truncate text-sm text-body">{t.body}</Td>
                <Td className="text-center"><Badge tone={t.isActive ? "on" : "off"}>{t.isActive ? "On" : "Off"}</Badge></Td>
                <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></Button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit — ${editing.name}` : "Edit template"} description="Use {{placeholders}} like {{name}}, {{code}}, {{location}}, {{time}}.">
        {editing && <EditForm key={editing.id} template={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function EditForm({ template, onDone }: { template: Template; onDone: () => void }) {
  const [state, action] = useActionState(saveTemplate, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <input type="hidden" name="id" value={template.id} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required><TextInput id="name" name="name" defaultValue={template.name} /></Field>
        <Field label="Channel" htmlFor="channel"><Select id="channel" name="channel" defaultValue={template.channel}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></Select></Field>
      </div>
      <Field label="Message body" htmlFor="body" required><Textarea id="body" name="body" rows={4} defaultValue={template.body} /></Field>
      <label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" name="isActive" defaultChecked={template.isActive} className="h-4 w-4 accent-brass" /> Active</label>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>Save</SubmitButton></div>
    </form>
  );
}
