"use client";

import { useActionState, useState } from "react";
import { Plus, UserCog, X } from "lucide-react";

import type { StaffMember } from "@/lib/repositories/staff";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { IDLE } from "@/lib/admin/validation";
import { createStaff, grantRole, revokeRole, deactivateStaff } from "@/app/admin/_actions/staff";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

type Loc = { id: string; name: string };

export function StaffManager({ staff, locations, canDeactivate }: { staff: StaffMember[]; locations: Loc[]; canDeactivate: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [managing, setManaging] = useState<StaffMember | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add staff</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Name</Th><Th>Email</Th><Th>Roles</Th><Th className="w-px" /></tr></thead>
          <tbody className="divide-y divide-sand">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-bg/30">
                <Td className="font-medium">{s.name ?? "—"}</Td>
                <Td className="text-body">{s.email}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {s.grants.map((g, i) => <Badge key={i} tone="accent">{ROLE_LABEL[g.role]} · {g.locationName}</Badge>)}
                  </div>
                </Td>
                <Td className="text-right"><Button variant="ghost" onClick={() => setManaging(s)}><UserCog className="h-4 w-4" /></Button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add staff" description="Create an account (or promote an existing user) and assign a role.">
        <AddStaffForm locations={locations} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={managing !== null} onClose={() => setManaging(null)} title={managing ? `Manage ${managing.name ?? managing.email}` : "Manage"}>
        {managing && <ManageStaff key={managing.id} member={managing} locations={locations} canDeactivate={canDeactivate} onDone={() => setManaging(null)} />}
      </Modal>
    </>
  );
}

function RoleLocationFields({ locations }: { locations: Loc[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Role" htmlFor="role">
        <Select id="role" name="role" defaultValue="staff">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </Field>
      <Field label="Location" htmlFor="locationId" hint="Blank = all locations (org-wide).">
        <Select id="locationId" name="locationId" defaultValue="">
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function AddStaffForm({ locations, onDone }: { locations: Loc[]; onDone: () => void }) {
  const [state, action] = useActionState(createStaff, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}><TextInput id="name" name="name" defaultValue={state.values?.name} /></Field>
        <Field label="Email" htmlFor="email" required error={state.errors?.email}><TextInput id="email" name="email" type="email" defaultValue={state.values?.email} /></Field>
      </div>
      <Field label="Temporary password" htmlFor="password" required error={state.errors?.password} hint="Share securely; they can change it later."><TextInput id="password" name="password" type="text" /></Field>
      <RoleLocationFields locations={locations} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>Add staff</SubmitButton></div>
    </form>
  );
}

function ManageStaff({ member, locations, canDeactivate, onDone }: { member: StaffMember; locations: Loc[]; canDeactivate: boolean; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-text">Current roles</p>
        <div className="flex flex-col gap-2">
          {member.grants.map((g, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-sand px-3 py-2">
              <span className="text-sm">{ROLE_LABEL[g.role]} · {g.locationName}</span>
              <RevokeButton profileId={member.id} role={g.role} locationId={g.locationId} />
            </div>
          ))}
          {member.grants.length === 0 && <p className="text-sm text-body">No roles.</p>}
        </div>
      </div>

      <GrantForm profileId={member.id} locations={locations} />

      {canDeactivate && (
        <div className="border-t border-sand pt-4">
          <DeactivateButton profileId={member.id} onDone={onDone} />
        </div>
      )}
    </div>
  );
}

function GrantForm({ profileId, locations }: { profileId: string; locations: Loc[] }) {
  const [state, action] = useActionState(grantRole, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="rounded-lg border border-sand bg-bg/30 p-4">
      <Banner state={state} />
      <p className="my-2 text-sm font-medium text-text">Add a role</p>
      <input type="hidden" name="profileId" value={profileId} />
      <RoleLocationFields locations={locations} />
      <div className="mt-3 flex justify-end"><SubmitButton variant="secondary">Add role</SubmitButton></div>
    </form>
  );
}

function RevokeButton({ profileId, role, locationId }: { profileId: string; role: Role; locationId: string | null }) {
  const [state, action] = useActionState(revokeRole, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove this role?")) e.preventDefault(); }}>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="role" value={role} />
      {locationId && <input type="hidden" name="locationId" value={locationId} />}
      <button type="submit" aria-label="Remove role" className="text-body hover:text-primary"><X className="h-4 w-4" /></button>
    </form>
  );
}

function DeactivateButton({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const [state, action] = useActionState(deactivateStaff, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove ALL access for this staff member?")) e.preventDefault(); }}>
      <input type="hidden" name="profileId" value={profileId} />
      <SubmitButton variant="danger">Deactivate (remove all access)</SubmitButton>
    </form>
  );
}
