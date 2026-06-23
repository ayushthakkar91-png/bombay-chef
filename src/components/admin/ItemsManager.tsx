"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Pencil, Search, Flame, Star } from "lucide-react";

import type { AdminItem, AdminCategory, Allergen } from "@/lib/repositories/admin-menu";
import { IDLE, formatPence } from "@/lib/admin/validation";
import {
  createItem,
  updateItem,
  deleteItem,
  toggleItemAvailable,
} from "@/app/admin/_actions/items";
import { Modal } from "./Modal";
import { useActionResult } from "./useActionResult";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  Select,
  SubmitButton,
  Textarea,
  TextInput,
  cx,
} from "./primitives";
import { Td, Th } from "./ui";
import { ImageUrlField } from "./ImageUrlField";

const DIETARY = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
];
const SPICE = ["None", "Mild", "Medium", "Hot"];

export function ItemsManager({
  items,
  categories,
  allergens,
  canManage,
}: {
  items: AdminItem[];
  categories: AdminCategory[];
  allergens: Allergen[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (cat === "" || i.categoryId === cat) &&
        (q === "" || i.name.toLowerCase().includes(q)),
    );
  }, [items, cat, query]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
          <TextInput
            placeholder="Search dishes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56 pl-8"
            aria-label="Search dishes"
          />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
        <span className="text-sm text-body">{filtered.length} of {items.length}</span>
        {canManage && (
          <Button className="ml-auto" onClick={() => setAddOpen(true)} disabled={categories.length === 0}>
            <Plus className="h-4 w-4" /> New dish
          </Button>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="Add a category first"
          description="Dishes belong to a category. Create at least one category before adding dishes."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "No dishes yet" : "No matches"}
          description={items.length === 0 ? "Add your first dish to start building the menu." : "Try a different search or category filter."}
          action={canManage && items.length === 0 ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a dish</Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr>
                <Th>Dish</Th>
                <Th>Category</Th>
                <Th className="text-right">Price</Th>
                <Th>Allergens</Th>
                <Th className="text-center">Available</Th>
                {canManage && <Th className="w-px" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-bg/30">
                  <Td>
                    <div className="flex items-center gap-2 font-medium">
                      {item.name}
                      {item.isSignature && <Star className="h-3.5 w-3.5 fill-brass text-brass" aria-label="Signature" />}
                      {item.spiceLevel ? (
                        <span className="flex items-center text-primary" aria-label={`Spice: ${SPICE[item.spiceLevel]}`}>
                          {Array.from({ length: item.spiceLevel }).map((_, i) => (
                            <Flame key={i} className="h-3.5 w-3.5" />
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td className="text-body">{item.categoryTitle}</Td>
                  <Td className="text-right tabular-nums">{item.pricePence != null ? formatPence(item.pricePence) : item.price || "—"}</Td>
                  <Td>{item.allergens.length ? <Badge tone="accent">{item.allergens.length}</Badge> : <span className="text-body/60">—</span>}</Td>
                  <Td className="text-center">
                    {canManage ? (
                      <RowAvailability item={item} />
                    ) : (
                      <Badge tone={item.isAvailable ? "on" : "off"}>{item.isAvailable ? "Yes" : "No"}</Badge>
                    )}
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <Button variant="ghost" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New dish">
        <ItemForm mode="create" categories={categories} allergens={allergens} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit “${editing.name}”` : "Edit dish"}>
        {editing && (
          <ItemForm key={editing.id} mode="edit" item={editing} categories={categories} allergens={allergens} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </>
  );
}

function RowAvailability({ item }: { item: AdminItem }) {
  const [state, action] = useActionState(toggleItemAvailable, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="next" value={item.isAvailable ? "false" : "true"} />
      <button
        type="submit"
        role="switch"
        aria-checked={item.isAvailable}
        aria-label={`Toggle availability for ${item.name}`}
        className={cx(
          "relative h-5 w-9 rounded-full transition-colors",
          item.isAvailable ? "bg-[#3a6b2e]" : "bg-sand",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all",
            item.isAvailable ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </button>
    </form>
  );
}

function ItemForm({
  mode,
  item,
  categories,
  allergens,
  onDone,
}: {
  mode: "create" | "edit";
  item?: AdminItem;
  categories: AdminCategory[];
  allergens: Allergen[];
  onDone: () => void;
}) {
  const action = mode === "create" ? createItem : updateItem;
  const [state, formAction] = useActionState(action, IDLE);
  useActionResult(state, onDone);

  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Banner state={state} />
      {mode === "edit" && <input type="hidden" name="id" value={item!.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={state.errors?.name}>
          <TextInput id="name" name="name" defaultValue={v?.name ?? item?.name} placeholder="Chicken Tikka Masala" />
        </Field>
        <Field label="Category" htmlFor="categoryId" required error={state.errors?.categoryId}>
          <Select id="categoryId" name="categoryId" defaultValue={v?.categoryId ?? item?.categoryId ?? ""}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" htmlFor="price" required error={state.errors?.price} hint="Stored as pence.">
          <TextInput id="price" name="price" inputMode="decimal" defaultValue={v?.price ?? (item ? formatPence(item.pricePence) || item.price : "")} placeholder="11.55" />
        </Field>
        <Field label="Spice level" htmlFor="spiceLevel" error={state.errors?.spiceLevel}>
          <Select id="spiceLevel" name="spiceLevel" defaultValue={item?.spiceLevel ?? ""}>
            <option value="">—</option>
            {SPICE.map((label, i) => (
              <option key={i} value={i}>{i} · {label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Calories" htmlFor="calories" hint="Optional.">
          <TextInput id="calories" name="calories" type="number" inputMode="numeric" defaultValue={item?.calories ?? ""} />
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={v?.description ?? item?.description ?? ""} placeholder="A short, evocative line for the menu." />
      </Field>

      <ImageUrlField defaultValue={item?.imageUrl ?? v?.imageUrl ?? ""} error={state.errors?.imageUrl} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Dietary</legend>
        <div className="flex flex-wrap gap-2">
          {DIETARY.map((d) => (
            <CheckChip key={d.id} name="dietary" value={d.id} label={d.label} defaultChecked={item?.dietary.includes(d.id)} />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Allergens</legend>
        <div className="flex flex-wrap gap-2">
          {allergens.map((a) => (
            <CheckChip key={a.id} name="allergens" value={a.id} label={a.label} defaultChecked={item?.allergens.includes(a.id)} />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2.5 text-sm text-text">
          <input type="checkbox" name="isAvailable" defaultChecked={item ? item.isAvailable : true} className="h-4 w-4 accent-[#3a6b2e]" />
          Available to order
        </label>
        <label className="flex items-center gap-2.5 text-sm text-text">
          <input type="checkbox" name="isSignature" defaultChecked={item?.isSignature ?? false} className="h-4 w-4 accent-brass" />
          Signature dish
        </label>
      </div>

      <input type="hidden" name="sortOrder" value={item?.sortOrder ?? 0} />

      <div className="mt-1 flex items-center justify-between gap-3">
        {mode === "edit" ? <DeleteItemButton item={item!} onDone={onDone} /> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <SubmitButton>{mode === "create" ? "Add dish" : "Save changes"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function CheckChip({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sand bg-surface px-3 py-1.5 text-sm text-body transition-colors has-[:checked]:border-brass has-[:checked]:bg-brass/10 has-[:checked]:text-[#6b5418]">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-3.5 w-3.5 accent-brass" />
      {label}
    </label>
  );
}

function DeleteItemButton({ item, onDone }: { item: AdminItem; onDone: () => void }) {
  const [state, formAction] = useActionState(deleteItem, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm(`Delete “${item.name}”? This can't be undone.`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={item.id} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">Delete</SubmitButton>
    </form>
  );
}
