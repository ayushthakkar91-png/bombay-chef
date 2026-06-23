"use client";

import { useActionState } from "react";

import type { TenantDetail, Plan } from "@/lib/repositories/platform";
import { IDLE } from "@/lib/admin/validation";
import { updateTenantStatus, updateTenantPlan, updateBranding, addTenantUser, removeTenantUser, startSubscription, openBillingPortal } from "@/app/platform/_actions/tenants";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Panel, Stat } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";

const tone = (s: string) => (s === "active" ? "on" : s === "suspended" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export function TenantManager({ tenant, plans, canPlatform }: { tenant: TenantDetail; plans: Plan[]; canPlatform: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Status" value={<Badge tone={tone(tenant.status)}>{tenant.status}</Badge>} />
        <Stat label="Plan" value={tenant.planName ?? "—"} />
        <Stat label="Locations" value={tenant.locationCount} />
        <Stat label="Members" value={tenant.users.length} />
      </div>

      {canPlatform && (
        <Panel title="Lifecycle & plan">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-body">Set status:</span>
              {["active", "suspended", "cancelled"].map((s) => <StatusBtn key={s} id={tenant.id} status={s} current={tenant.status} />)}
            </div>
            <PlanForm id={tenant.id} plans={plans} currentPlan={tenant.planName} />
          </div>
        </Panel>
      )}

      <Panel title="Billing">
        <div className="flex flex-col gap-4 p-5">
          <div className="text-sm text-body">Subscription: <span className="font-medium text-text">{tenant.subscription?.status ?? "none"}</span>{tenant.subscription?.interval ? ` · ${tenant.subscription.interval}` : ""}</div>
          <div className="flex flex-wrap gap-2">
            <BillingBtn id={tenant.id} interval="monthly" label="Subscribe monthly" action={startSubscription} extra={{}} />
            <BillingBtn id={tenant.id} interval="annual" label="Subscribe annually" action={startSubscription} extra={{}} />
            {tenant.subscription?.stripeCustomerId && <PortalBtn id={tenant.id} customerId={tenant.subscription.stripeCustomerId} />}
          </div>
        </div>
      </Panel>

      <Panel title="Branding & white-label"><BrandingForm tenant={tenant} /></Panel>

      <Panel title="Members">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Member</Th><Th>Role</Th><Th className="w-px" /></tr></thead>
          <tbody className="divide-y divide-sand">
            {tenant.users.map((u) => (
              <tr key={u.userId} className="hover:bg-bg/30">
                <Td><span className="font-medium">{u.name ?? "—"}</span><div className="text-xs text-body">{u.email}</div></Td>
                <Td><Badge tone="neutral">{u.role}</Badge></Td>
                <Td className="text-right">{u.role !== "owner" && <RemoveUserBtn id={tenant.id} userId={u.userId} />}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-sand p-4"><AddUserForm id={tenant.id} /></div>
      </Panel>
    </div>
  );
}

function StatusBtn({ id, status, current }: { id: string; status: string; current: string }) {
  const [state, action] = useActionState(updateTenantStatus, IDLE);
  useActionResult(state);
  return (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <Button type="submit" variant={status === "active" ? "secondary" : "danger"} disabled={current === status}>{status}</Button>
    </form>
  );
}

function PlanForm({ id, plans, currentPlan }: { id: string; plans: Plan[]; currentPlan: string | null }) {
  const [state, action] = useActionState(updateTenantPlan, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label="Plan" htmlFor="planKey"><Select id="planKey" name="planKey" defaultValue={plans.find((p) => p.name === currentPlan)?.key ?? plans[0]?.key}>{plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</Select></Field>
      <SubmitButton variant="secondary">Update plan</SubmitButton>
    </form>
  );
}

function BrandingForm({ tenant }: { tenant: TenantDetail }) {
  const [state, action] = useActionState(updateBranding, IDLE);
  useActionResult(state);
  const s = tenant.settings;
  return (
    <form action={action} className="flex flex-col gap-4 p-5">
      <Banner state={state} />
      <input type="hidden" name="id" value={tenant.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand name" htmlFor="brandName"><TextInput id="brandName" name="brandName" defaultValue={s?.brandName ?? tenant.name} /></Field>
        <Field label="Support email" htmlFor="supportEmail"><TextInput id="supportEmail" name="supportEmail" type="email" defaultValue={s?.supportEmail ?? ""} /></Field>
        <Field label="Primary colour" htmlFor="primaryColor"><TextInput id="primaryColor" name="primaryColor" defaultValue={s?.primaryColor ?? "#2B221D"} /></Field>
        <Field label="Accent colour" htmlFor="accentColor"><TextInput id="accentColor" name="accentColor" defaultValue={s?.accentColor ?? "#B08A3E"} /></Field>
        <Field label="Logo URL" htmlFor="logoUrl"><TextInput id="logoUrl" name="logoUrl" defaultValue={s?.logoUrl ?? ""} /></Field>
        <Field label="Custom domain" htmlFor="customDomain"><TextInput id="customDomain" name="customDomain" defaultValue={s?.customDomain ?? ""} placeholder="order.brand.com" /></Field>
      </div>
      <div className="flex justify-end"><SubmitButton>Save branding</SubmitButton></div>
    </form>
  );
}

function AddUserForm({ id }: { id: string }) {
  const [state, action] = useActionState(addTenantUser, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Banner state={state} />
      <div className="min-w-[220px] flex-1"><Field label="Add member by email" htmlFor="email"><TextInput id="email" name="email" type="email" placeholder="manager@restaurant.com" /></Field></div>
      <Field label="Role" htmlFor="role"><Select id="role" name="role" defaultValue="member"><option value="member">Member</option><option value="admin">Admin</option><option value="owner">Owner</option></Select></Field>
      <SubmitButton variant="secondary">Add</SubmitButton>
    </form>
  );
}

function RemoveUserBtn({ id, userId }: { id: string; userId: string }) {
  const [state, action] = useActionState(removeTenantUser, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove this member?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost">Remove</Button>
    </form>
  );
}

function BillingBtn({ id, interval, label, action }: { id: string; interval: string; label: string; action: typeof startSubscription; extra: Record<string, string> }) {
  const [state, formAction] = useActionState(action, IDLE);
  useActionResult(state);
  return (
    <form action={formAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="interval" value={interval} /><SubmitButton variant="secondary">{label}</SubmitButton></form>
  );
}

function PortalBtn({ id, customerId }: { id: string; customerId: string }) {
  const [state, action] = useActionState(openBillingPortal, IDLE);
  useActionResult(state);
  return (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="customerId" value={customerId} /><SubmitButton>Billing portal</SubmitButton></form>
  );
}
