"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import type { AdminLocation } from "@/lib/repositories/admin-locations";
import { IDLE } from "@/lib/admin/validation";
import {
  createLocation,
  updateLocation,
  toggleLocationActive,
} from "@/app/admin/_actions/locations";
import { Modal } from "./Modal";
import { useActionResult } from "./useActionResult";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  SubmitButton,
  Textarea,
  TextInput,
} from "./primitives";
import { Td, Th } from "./ui";

export function LocationsManager({
  locations,
  canManage,
}: {
  locations: AdminLocation[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLocation | null>(null);

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New location</Button>
        </div>
      )}

      {locations.length === 0 ? (
        <EmptyState
          title="No locations yet"
          description="Add your Balham, Battersea and Kilburn branches to manage their details and per-branch menu."
          action={canManage ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a location</Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr>
                <Th>Name</Th>
                <Th>Address</Th>
                <Th>Phone</Th>
                <Th className="text-center">Status</Th>
                {canManage && <Th className="w-px" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {locations.map((l) => (
                <tr key={l.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{l.name}</Td>
                  <Td className="max-w-xs truncate text-body">{l.address}</Td>
                  <Td className="text-body">{l.phone ?? "—"}</Td>
                  <Td className="text-center">
                    <Badge tone={l.isActive ? "on" : "off"}>{l.isActive ? "Active" : "Hidden"}</Badge>
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <Button variant="ghost" onClick={() => setEditing(l)} aria-label={`Edit ${l.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New location">
        <LocationForm mode="create" onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit location"}>
        {editing && <LocationForm key={editing.id} mode="edit" location={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function LocationForm({
  mode,
  location,
  onDone,
}: {
  mode: "create" | "edit";
  location?: AdminLocation;
  onDone: () => void;
}) {
  const action = mode === "create" ? createLocation : updateLocation;
  const [state, formAction] = useActionState(action, IDLE);
  useActionResult(state, onDone);
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Banner state={state} />
      {mode === "edit" && <input type="hidden" name="id" value={location!.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}>
          <TextInput id="name" name="name" defaultValue={v?.name ?? location?.name} placeholder="Balham" />
        </Field>
        <Field label="Slug" htmlFor="slug" required error={state.errors?.slug} hint="Used in the URL.">
          <TextInput id="slug" name="slug" defaultValue={v?.slug ?? location?.slug} placeholder="balham" />
        </Field>
      </div>

      <Field label="Address" htmlFor="address" required error={state.errors?.address}>
        <Textarea id="address" name="address" defaultValue={v?.address ?? location?.address} placeholder="Street, London, postcode" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone">
          <TextInput id="phone" name="phone" defaultValue={location?.phone ?? ""} placeholder="020 …" />
        </Field>
        <Field label="Hours" htmlFor="hours">
          <TextInput id="hours" name="hours" defaultValue={location?.hours ?? ""} placeholder="Mon–Sun, 12–11" />
        </Field>
      </div>

      <Field label="Atmosphere" htmlFor="atmosphere" hint="A short line for the locations page.">
        <Textarea id="atmosphere" name="atmosphere" defaultValue={location?.atmosphere ?? ""} />
      </Field>

      <Field label="Image URL" htmlFor="imageUrl" error={state.errors?.imageUrl}>
        <TextInput id="imageUrl" name="imageUrl" defaultValue={v?.imageUrl ?? location?.imageUrl ?? ""} placeholder="https://…" />
      </Field>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2.5 text-sm text-text">
          <input type="checkbox" name="isActive" defaultChecked={location ? location.isActive : true} className="h-4 w-4 accent-[#3a6b2e]" />
          Visible on the public site
        </label>
        <input type="hidden" name="sortOrder" value={location?.sortOrder ?? 0} />
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        {mode === "edit" ? <ToggleActiveButton location={location!} onDone={onDone} /> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <SubmitButton>{mode === "create" ? "Add location" : "Save changes"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function ToggleActiveButton({ location, onDone }: { location: AdminLocation; onDone: () => void }) {
  const [state, formAction] = useActionState(toggleLocationActive, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={location.id} />
      <input type="hidden" name="next" value={location.isActive ? "false" : "true"} />
      <SubmitButton variant="secondary">{location.isActive ? "Hide from site" : "Make visible"}</SubmitButton>
    </form>
  );
}
