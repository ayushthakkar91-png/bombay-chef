"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

import type { Supplier } from "@/lib/repositories/suppliers";
import { IDLE } from "@/lib/admin/validation";
import { saveSupplier, toggleSupplier } from "@/app/admin/_actions/suppliers";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New supplier</Button></div>
      {suppliers.length === 0 ? (
        <EmptyState title="No suppliers" description="Add your suppliers to build purchase orders and a price catalogue." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a supplier</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Supplier</Th><Th>Contact</Th><Th>Phone</Th><Th className="text-center">Status</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-bg/30">
                  <Td><Link href={`/admin/inventory/suppliers/${s.id}`} className="font-medium text-text hover:text-primary">{s.name}</Link><div className="text-xs text-body">{s.email}</div></Td>
                  <Td className="text-body">{s.contactName ?? "—"}</Td>
                  <Td className="text-body">{s.phone ?? "—"}</Td>
                  <Td className="text-center"><Badge tone={s.isActive ? "on" : "off"}>{s.isActive ? "Active" : "Inactive"}</Badge></Td>
                  <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></Button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New supplier"><SupplierForm onDone={() => setAddOpen(false)} /></Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit supplier"}>
        {editing && <SupplierForm key={editing.id} supplier={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: () => void }) {
  const [state, action] = useActionState(saveSupplier, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}><TextInput id="name" name="name" defaultValue={state.values?.name ?? supplier?.name} /></Field>
        <Field label="Contact name" htmlFor="contactName"><TextInput id="contactName" name="contactName" defaultValue={supplier?.contactName ?? ""} /></Field>
        <Field label="Email" htmlFor="email"><TextInput id="email" name="email" type="email" defaultValue={supplier?.email ?? ""} /></Field>
        <Field label="Phone" htmlFor="phone"><TextInput id="phone" name="phone" defaultValue={supplier?.phone ?? ""} /></Field>
      </div>
      <Field label="Address" htmlFor="address"><Textarea id="address" name="address" defaultValue={supplier?.address ?? ""} /></Field>
      <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} /></Field>
      <div className="flex items-center justify-between gap-3">
        {supplier ? <ToggleSupplier supplier={supplier} onDone={onDone} /> : <span />}
        <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>{supplier ? "Save" : "Add supplier"}</SubmitButton></div>
      </div>
    </form>
  );
}

function ToggleSupplier({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const [state, action] = useActionState(toggleSupplier, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={supplier.id} />
      <input type="hidden" name="next" value={supplier.isActive ? "false" : "true"} />
      <SubmitButton variant="secondary">{supplier.isActive ? "Deactivate" : "Activate"}</SubmitButton>
    </form>
  );
}
