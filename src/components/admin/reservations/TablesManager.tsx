"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import { IDLE } from "@/lib/admin/validation";
import { upsertTable, deleteTable } from "@/app/admin/_actions/tables";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export type TableRow = {
  id: string;
  name: string;
  seats: number;
  min_party: number;
  max_party: number;
  zone: string | null;
  is_active: boolean;
};

const ZONES = ["window", "main", "bar", "private", "terrace"];

export function TablesManager({ tables, locationId }: { tables: TableRow[]; locationId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-body">{tables.length} tables · {tables.reduce((s, t) => s + t.seats, 0)} seats</p>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add table</Button>
      </div>

      {tables.length === 0 ? (
        <EmptyState title="No tables yet" description="Add your dining tables and their capacities." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a table</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr>
                <Th>Name</Th><Th className="text-center">Seats</Th><Th className="text-center">Party</Th><Th>Zone</Th><Th className="text-center">Active</Th><Th className="w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {tables.map((t) => (
                <tr key={t.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{t.name}</Td>
                  <Td className="text-center tabular-nums">{t.seats}</Td>
                  <Td className="text-center tabular-nums text-body">{t.min_party}–{t.max_party}</Td>
                  <Td className="text-body capitalize">{t.zone ?? "—"}</Td>
                  <Td className="text-center"><Badge tone={t.is_active ? "on" : "off"}>{t.is_active ? "Yes" : "No"}</Badge></Td>
                  <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></Button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add table">
        <TableForm locationId={locationId} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit table"}>
        {editing && <TableForm key={editing.id} table={editing} locationId={locationId} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function TableForm({ table, locationId, onDone }: { table?: TableRow; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(upsertTable, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      {table && <input type="hidden" name="id" value={table.id} />}
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}>
          <TextInput id="name" name="name" defaultValue={table?.name} placeholder="T7" />
        </Field>
        <Field label="Seats" htmlFor="seats" required error={state.errors?.seats}>
          <TextInput id="seats" name="seats" type="number" min={1} defaultValue={table?.seats ?? 2} />
        </Field>
        <Field label="Min party" htmlFor="minParty">
          <TextInput id="minParty" name="minParty" type="number" min={1} defaultValue={table?.min_party ?? 1} />
        </Field>
        <Field label="Max party" htmlFor="maxParty">
          <TextInput id="maxParty" name="maxParty" type="number" min={1} defaultValue={table?.max_party ?? table?.seats ?? 2} />
        </Field>
        <Field label="Zone" htmlFor="zone">
          <Select id="zone" name="zone" defaultValue={table?.zone ?? ""}>
            <option value="">—</option>
            {ZONES.map((z) => <option key={z} value={z} className="capitalize">{z}</option>)}
          </Select>
        </Field>
        <label className="mt-7 flex items-center gap-2.5 text-sm text-text">
          <input type="checkbox" name="isActive" defaultChecked={table ? table.is_active : true} className="h-4 w-4 accent-[#3a6b2e]" /> Active
        </label>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        {table ? <DeleteTableButton table={table} locationId={locationId} onDone={onDone} /> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <SubmitButton>{table ? "Save" : "Add table"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function DeleteTableButton({ table, locationId, onDone }: { table: TableRow; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(deleteTable, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(`Delete table ${table.name}?`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={table.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">Delete</SubmitButton>
    </form>
  );
}
