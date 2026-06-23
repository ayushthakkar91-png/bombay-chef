"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import type { Plan } from "@/lib/repositories/platform";
import { provisionTenantAction } from "@/app/platform/_actions/tenants";
import { Button, Field, Select, TextInput, Textarea } from "@/components/admin/primitives";

const STEPS = ["Profile", "Branding", "Locations", "Menu", "Review"];
const gbp = (p: number) => `£${(p / 100).toLocaleString("en-GB")}`;

type Loc = { name: string; address: string };

export function SetupWizard({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [planKey, setPlanKey] = useState(plans[1]?.key ?? plans[0]?.key ?? "starter");
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2B221D");
  const [accentColor, setAccentColor] = useState("#B08A3E");
  const [supportEmail, setSupportEmail] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [locations, setLocations] = useState<Loc[]>([{ name: "", address: "" }]);
  const [menuText, setMenuText] = useState("");

  const canNext = step === 0 ? name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) && ownerPassword.length >= 8 : true;

  const parseMenu = () =>
    menuText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [category, dish, price, ...rest] = line.split("|").map((s) => s.trim());
      return { category: category || "Menu", name: dish || category, price: price || "", description: rest.join(" | ") || undefined };
    }).filter((m) => m.name);

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await provisionTenantAction({
        name, ownerEmail, ownerPassword, planKey,
        brandName: brandName || name, primaryColor, accentColor, supportEmail: supportEmail || undefined, customDomain: customDomain || null,
        locations: locations.filter((l) => l.name.trim()),
        seedMenu: parseMenu(),
      });
      if (res.ok) router.push(`/platform/tenants/${res.tenantId}`);
      else setError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center justify-between">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i < step ? "bg-brass text-bg" : i === step ? "border-2 border-brass text-brass" : "border border-sand text-body"}`}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</div>
            <span className={`ml-2 hidden text-sm sm:block ${i === step ? "text-text" : "text-body"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-sand" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-sand bg-surface p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-xl text-text">Restaurant profile</h2>
            <Field label="Restaurant name" htmlFor="name" required><TextInput id="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Owner email" htmlFor="oe" required><TextInput id="oe" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></Field>
              <Field label="Owner password" htmlFor="op" required hint="≥ 8 chars"><TextInput id="op" type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} /></Field>
            </div>
            <Field label="Plan" htmlFor="plan">
              <Select id="plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)}>{plans.map((p) => <option key={p.key} value={p.key}>{p.name} — {gbp(p.monthlyPence)}/mo</option>)}</Select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-xl text-text">Branding</h2>
            <Field label="Brand name" htmlFor="bn" hint="Defaults to the restaurant name."><TextInput id="bn" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={name} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary colour" htmlFor="pc"><div className="flex gap-2"><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 rounded border border-sand" /><TextInput id="pc" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /></div></Field>
              <Field label="Accent colour" htmlFor="ac"><div className="flex gap-2"><input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-12 rounded border border-sand" /><TextInput id="ac" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} /></div></Field>
            </div>
            <Field label="Support email" htmlFor="se"><TextInput id="se" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></Field>
            <Field label="Custom domain" htmlFor="cd" hint="Optional white-label domain (DNS configured separately)."><TextInput id="cd" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="order.yourrestaurant.com" /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-xl text-text">Locations</h2>
            {locations.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={`Location ${i + 1}`} htmlFor={`ln${i}`}><TextInput id={`ln${i}`} value={l.name} onChange={(e) => setLocations(locations.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" /></Field>
                <div className="flex-1"><Field label="Address" htmlFor={`la${i}`}><TextInput id={`la${i}`} value={l.address} onChange={(e) => setLocations(locations.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} /></Field></div>
                {locations.length > 1 && <button onClick={() => setLocations(locations.filter((_, j) => j !== i))} className="mb-2 text-body hover:text-primary" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            <Button variant="secondary" onClick={() => setLocations([...locations, { name: "", address: "" }])}><Plus className="h-4 w-4" /> Add location</Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-xl text-text">Menu import <span className="text-sm font-normal text-body">(optional)</span></h2>
            <p className="text-sm text-body">One dish per line: <code className="rounded bg-bg px-1">Category | Dish | £Price | Description</code>. Staged now, applied when the workspace is activated.</p>
            <Textarea rows={8} value={menuText} onChange={(e) => setMenuText(e.target.value)} placeholder={"Starters | Onion Bhaji | £5.95 | Crisp & golden\nCurries | Butter Chicken | £12.95"} />
            <p className="text-xs text-body/70">{parseMenu().length} dishes detected.</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-xl text-text">Review</h2>
            <Row k="Restaurant" v={name} /><Row k="Owner" v={ownerEmail} /><Row k="Plan" v={plans.find((p) => p.key === planKey)?.name ?? planKey} />
            <Row k="Locations" v={locations.filter((l) => l.name.trim()).map((l) => l.name).join(", ") || "—"} /><Row k="Menu" v={`${parseMenu().length} dishes`} />
            <Row k="Custom domain" v={customDomain || "—"} />
            {error && <p role="alert" className="text-sm text-primary">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-sand pt-4">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>Back</Button>
          {step < STEPS.length - 1
            ? <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue</Button>
            : <Button onClick={submit} disabled={pending}>{pending ? "Provisioning…" : "Create restaurant"}</Button>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 border-b border-sand py-2 text-sm"><span className="text-body">{k}</span><span className="font-medium text-text">{v}</span></div>;
}
