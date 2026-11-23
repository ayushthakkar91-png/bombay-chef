"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Phone, Search, Trash2, Minus, Plus, Check, Printer } from "lucide-react";

import type { OrderingMenu, OrderMenuItem, OrderModifier } from "@/lib/repositories/ordering-menu";
import type { CartLineInput } from "@/lib/ordering/types";
import type { Fulfilment } from "@/lib/ordering/constants";
import type { PriceResult } from "@/lib/ordering/pricing";
import { money } from "@/lib/format";
import { Button, Field, TextInput, Textarea, Badge, Spinner } from "@/components/admin/primitives";
import { pricePhoneOrder, placePhoneOrder, lookupPhoneCustomer } from "@/app/admin/_actions/phone-orders";

/**
 * The order-taking screen. Somebody is on the phone, so:
 *
 *   - phone number first: a returning caller's name and address fill in;
 *   - the menu is a search box, not a scroll — type three letters, press
 *     Enter, it is in the order;
 *   - totals come from the server as the order is built, the same arithmetic
 *     the website uses, so what staff read out is what prints;
 *   - "Place order" is one press, and a double press cannot place two.
 */

type Line = {
  key: string;
  item: OrderMenuItem;
  modifiers: OrderModifier[];
  qty: number;
  notes: string;
};

type Props = {
  location: { id: string; slug: string; name: string; deliveryEnabled: boolean; collectionEnabled: boolean };
  menu: OrderingMenu;
  takenBy: string;
};

export function PhoneOrderForm({ location, menu, takenBy }: Props) {
  // ---- The caller ----------------------------------------------------------
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [known, setKnown] = useState<{ orders: number } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // ---- How they get it -----------------------------------------------------
  const [fulfilment, setFulfilment] = useState<Fulfilment>(location.deliveryEnabled ? "delivery" : "collection");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("London");
  const [postcode, setPostcode] = useState("");

  // ---- What they want ------------------------------------------------------
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [choosing, setChoosing] = useState<OrderMenuItem | null>(null);
  const [notes, setNotes] = useState("");

  // ---- Money ---------------------------------------------------------------
  const [payment, setPayment] = useState<"cash" | "terminal">("cash");
  // The last server price and the inputs it was for. "Still pricing" is the
  // gap between the two, derived rather than stored, so no state is set from
  // inside the effect.
  const [priced, setPriced] = useState<{ sig: string; result: PriceResult | null }>({ sig: "", result: null });

  // ---- Placing -------------------------------------------------------------
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ code: string; dailySeq: number | null; totalPence: number } | null>(null);
  // One key per attempt. A double-click sends the same key twice and the
  // server returns the same order; a new order gets a new key.
  const attemptKey = useRef<string>(crypto.randomUUID());

  const items = useMemo(() => menu.categories.flatMap((c) => c.items), [menu]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return items.filter((i) => words.every((w) => i.name.toLowerCase().includes(w))).slice(0, 8);
  }, [items, query]);

  const wire: CartLineInput[] = useMemo(
    () => lines.map((l) => ({ itemId: l.item.id, modifierIds: l.modifiers.map((m) => m.id), modifierNames: l.modifiers.map((m) => m.name), qty: l.qty, notes: l.notes || undefined })),
    [lines],
  );

  // Server totals as the order changes. Debounced: a burst of "+ + +" is one
  // round trip, not three.
  const priceSig = JSON.stringify({ wire, fulfilment, postcode: fulfilment === "delivery" ? postcode : null });
  useEffect(() => {
    if (wire.length === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      pricePhoneOrder({ locationId: location.id, locationSlug: location.slug, fulfilment, lines: wire, postcode: fulfilment === "delivery" ? postcode : null })
        .then((r) => { if (!cancelled) setPriced({ sig: priceSig, result: r }); })
        .catch(() => { if (!cancelled) setPriced({ sig: priceSig, result: null }); });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
    // priceSig encodes every input used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceSig]);
  const price = wire.length > 0 ? priced.result : null;
  const pricing = wire.length > 0 && priced.sig !== priceSig;

  // ---- Returning caller ----------------------------------------------------
  async function lookup() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return;
    setLookingUp(true);
    try {
      const found = await lookupPhoneCustomer(phone);
      if (found) {
        setKnown({ orders: found.orders });
        if (!name) setName(found.name);
        if (!email && found.email) setEmail(found.email);
        if (found.address && !line1) {
          setLine1(found.address.line1);
          setLine2(found.address.line2);
          setCity(found.address.city);
          setPostcode(found.address.postcode);
        }
      } else {
        setKnown(null);
      }
    } finally {
      setLookingUp(false);
    }
  }

  // ---- Adding dishes -------------------------------------------------------
  function add(item: OrderMenuItem, modifiers: OrderModifier[] = []) {
    const key = item.id + "|" + modifiers.map((m) => m.id).join(",");
    setLines((prev) => {
      const i = prev.findIndex((l) => l.key === key && !l.notes);
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { key, item, modifiers, qty: 1, notes: "" }];
    });
    setQuery("");
    setChoosing(null);
  }

  function pick(item: OrderMenuItem) {
    // A dish with a required choice (size, say) needs the choice made. One
    // with only optional extras goes straight in; extras are rare on the phone.
    const required = item.modifierGroups.filter((g) => g.minSelect > 0);
    if (required.length === 0) add(item);
    else setChoosing(item);
  }

  function setQty(key: string, qty: number) {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))));
  }

  // ---- Placing -------------------------------------------------------------
  function place() {
    setError(null);
    startTransition(async () => {
      const r = await placePhoneOrder({
        locationId: location.id,
        locationSlug: location.slug,
        fulfilment,
        lines: wire,
        contact: { name, phone, email: email || undefined },
        deliveryAddress: fulfilment === "delivery" ? { line1, line2, city, postcode } : undefined,
        notes,
        payment,
        idempotencyKey: attemptKey.current,
      });
      if (r.ok) setPlaced(r);
      else setError(r.error);
    });
  }

  function startAnother() {
    attemptKey.current = crypto.randomUUID();
    setPlaced(null); setError(null);
    setPhone(""); setName(""); setEmail(""); setKnown(null);
    setLine1(""); setLine2(""); setCity("London"); setPostcode("");
    setLines([]); setNotes(""); setPayment("cash"); setPriced({ sig: "", result: null });
  }

  // ---- Placed ----------------------------------------------------------------
  if (placed) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-sand bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f0e3] text-[#3a6b2e]"><Check className="h-6 w-6" /></div>
        {placed.dailySeq != null && <p className="font-display text-5xl text-text">Order {placed.dailySeq}</p>}
        <p className="mt-2 text-sm text-body">#{placed.code} · {money(placed.totalPence)} · {payment === "cash" ? "cash to collect" : "paid on terminal"}</p>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-body"><Printer className="h-4 w-4" /> Printing on the {location.name} till now.</p>
        <Button className="mt-6" onClick={startAnother} autoFocus>Take another order</Button>
      </div>
    );
  }

  const canPlace = !pending && wire.length > 0 && name.trim() && phone.trim() && (fulfilment !== "delivery" || (line1.trim() && postcode.trim())) && price?.ok;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ---- Left: who, where, what ---- */}
      <div className="space-y-6">
        <section className="rounded-lg border border-sand bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-body">Who is calling</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone number" htmlFor="po-phone" required hint={known ? `Ordered ${known.orders} time${known.orders === 1 ? "" : "s"} before — details filled in.` : "Press Enter to look them up."}>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-body/60" />
                <TextInput id="po-phone" className="pl-9" inputMode="tel" autoComplete="off" autoFocus value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={lookup}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }} />
                {lookingUp && <span className="absolute right-3 top-2.5"><Spinner /></span>}
              </div>
            </Field>
            <Field label="Name" htmlFor="po-name" required>
              <TextInput id="po-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="po-email" hint="Optional — they get a confirmation if given.">
              <TextInput id="po-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-sand bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-body">How they get it</h2>
            <div className="inline-flex rounded-md border border-sand p-0.5">
              {(["delivery", "collection"] as Fulfilment[]).map((f) => {
                const enabled = f === "delivery" ? location.deliveryEnabled : location.collectionEnabled;
                return (
                  <button key={f} type="button" disabled={!enabled} onClick={() => setFulfilment(f)}
                    className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors disabled:opacity-40 ${fulfilment === f ? "bg-primary text-on-dark" : "text-body hover:bg-sand/50"}`}>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
          {fulfilment === "delivery" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address line 1" htmlFor="po-l1" required><TextInput id="po-l1" autoComplete="off" value={line1} onChange={(e) => setLine1(e.target.value)} /></Field>
              <Field label="Line 2" htmlFor="po-l2"><TextInput id="po-l2" autoComplete="off" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Flat, floor, building" /></Field>
              <Field label="City" htmlFor="po-city"><TextInput id="po-city" autoComplete="off" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              <Field label="Postcode" htmlFor="po-pc" required hint={price && !price.ok && /deliver/i.test(price.error) ? price.error : undefined}>
                <TextInput id="po-pc" autoComplete="off" className="uppercase" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
              </Field>
            </div>
          ) : (
            <p className="text-sm text-body">They will collect from {location.name}.</p>
          )}
        </section>

        <section className="rounded-lg border border-sand bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-body">What they want</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-body/60" />
            <TextInput className="pl-9" placeholder="Type a dish — e.g. chicken tikka, pilau, naan" autoComplete="off" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0]); }
                if (e.key === "Escape") setQuery("");
              }} />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-sand bg-surface shadow-lg">
                {matches.map((m, i) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => pick(m)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-sand/50 ${i === 0 ? "bg-sand/30" : ""}`}>
                      <span>{m.name}{m.modifierGroups.some((g) => g.minSelect > 0) && <span className="ml-2 text-xs text-body">choose size</span>}</span>
                      <span className="text-body">{money(m.pricePence)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {choosing && (
            <div className="mt-3 rounded-md border border-brass/40 bg-brass/5 p-3">
              <p className="mb-2 text-sm font-medium">{choosing.name} — which one?</p>
              <div className="flex flex-wrap gap-2">
                {choosing.modifierGroups.filter((g) => g.minSelect > 0).flatMap((g) => g.options).map((o) => (
                  <Button key={o.id} variant="secondary" onClick={() => add(choosing, [o])} autoFocus={o.isDefault}>
                    {o.name}{o.priceDeltaPence > 0 && <span className="text-body">+{money(o.priceDeltaPence)}</span>}
                  </Button>
                ))}
                <Button variant="ghost" onClick={() => setChoosing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {lines.length === 0 ? (
            <p className="mt-4 text-sm text-body">Nothing added yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-sand">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3 py-2.5">
                  <div className="inline-flex items-center rounded-md border border-sand">
                    <button type="button" aria-label="Fewer" onClick={() => setQty(l.key, l.qty - 1)} className="px-2 py-1 text-body hover:bg-sand/50"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm font-medium">{l.qty}</span>
                    <button type="button" aria-label="More" onClick={() => setQty(l.key, l.qty + 1)} className="px-2 py-1 text-body hover:bg-sand/50"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.item.name}{l.modifiers.length > 0 && <span className="ml-1 text-body">· {l.modifiers.map((m) => m.name).join(", ")}</span>}</p>
                    <input className="mt-0.5 w-full bg-transparent text-xs text-body placeholder:text-body/50 focus:outline-none" placeholder="Note for the kitchen (no onions, extra hot…)"
                      value={l.notes} onChange={(e) => setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, notes: e.target.value } : x)))} />
                  </div>
                  <span className="w-16 text-right text-sm">{money((l.item.pricePence + l.modifiers.reduce((s, m) => s + m.priceDeltaPence, 0)) * l.qty)}</span>
                  <button type="button" aria-label="Remove" onClick={() => setQty(l.key, 0)} className="p-1 text-body hover:text-primary"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <Field label="Note for the whole order" htmlFor="po-notes">
              <Textarea id="po-notes" className="min-h-14" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ring the top bell, leave at door…" />
            </Field>
          </div>
        </section>
      </div>

      {/* ---- Right: money and the button ---- */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-sand bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-body">Payment</h2>
          <div className="grid grid-cols-2 gap-2">
            {([["cash", "Cash", fulfilment === "delivery" ? "at the door" : "at the counter"], ["terminal", "Card", "on the terminal"]] as const).map(([v, label, hint]) => (
              <button key={v} type="button" onClick={() => setPayment(v)}
                className={`rounded-md border px-3 py-2.5 text-left transition-colors ${payment === v ? "border-primary bg-primary/5" : "border-sand hover:bg-sand/40"}`}>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-body">{hint}</span>
              </button>
            ))}
          </div>

          <dl className="mt-5 space-y-1.5 text-sm">
            <Row label="Items" value={String(lines.reduce((s, l) => s + l.qty, 0))} />
            {price?.ok && <Row label="Subtotal" value={money(price.subtotalPence)} />}
            {price?.ok && fulfilment === "delivery" && <Row label="Delivery" value={price.deliveryFeePence === 0 ? "Free" : money(price.deliveryFeePence)} />}
            <div className="flex items-baseline justify-between border-t border-sand pt-2">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-2xl">{pricing ? <Spinner /> : price?.ok ? money(price.totalPence) : "—"}</dd>
            </div>
          </dl>
          {price && !price.ok && <p className="mt-2 text-xs text-primary">{price.error}</p>}
          {price?.ok && <p className="mt-2 text-xs text-body">Ready in about {price.etaMin} min.</p>}

          {error && <p className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{error}</p>}

          <Button className="mt-5 w-full py-3 text-base" disabled={!canPlace} onClick={place}>
            {pending ? <><Spinner /> Placing…</> : `Place order${price?.ok ? " · " + money(price.totalPence) : ""}`}
          </Button>
          <p className="mt-3 text-center text-xs text-body">Taken by {takenBy} <Badge tone="accent">phone</Badge></p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-body">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
