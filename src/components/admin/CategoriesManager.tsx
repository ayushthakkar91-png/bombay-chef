"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import type { AdminCategory } from "@/lib/repositories/admin-menu";
import { IDLE } from "@/lib/admin/validation";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/admin/_actions/categories";
import { Modal } from "./Modal";
import { useActionResult } from "./useActionResult";
import {
  Badge,
  Banner,
  Button,
  EmptyState,
  Field,
  SubmitButton,
  TextInput,
} from "./primitives";
import { Td, Th } from "./ui";

export function CategoriesManager({
  categories,
  canManage,
}: {
  categories: AdminCategory[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  return (
    <>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories group your dishes on the menu — Starters, Tandoor, Curries, and so on."
          action={
            canManage ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add the first category
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Slug</Th>
                <Th className="text-right">Dishes</Th>
                <Th className="text-right">Order</Th>
                {canManage && <Th className="w-px" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{c.title}</Td>
                  <Td><Badge>{c.id.startsWith("drinks-") ? "Drinks" : "Food"}</Badge></Td>
                  <Td><code className="rounded bg-bg px-1.5 py-0.5 text-xs text-body">{c.id}</code></Td>
                  <Td className="text-right tabular-nums">{c.itemCount}</Td>
                  <Td className="text-right tabular-nums text-body">{c.sortOrder}</Td>
                  {canManage && (
                    <Td className="text-right">
                      <Button variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.title}`}>
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New category" description="Add a new menu section.">
        <CategoryForm mode="create" onDone={() => setAddOpen(false)} />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit “${editing.title}”` : "Edit category"}
      >
        {editing && (
          <CategoryForm
            key={editing.id}
            mode="edit"
            category={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

function CategoryForm({
  mode,
  category,
  onDone,
}: {
  mode: "create" | "edit";
  category?: AdminCategory;
  onDone: () => void;
}) {
  const action = mode === "create" ? createCategory : updateCategory;
  const [state, formAction] = useActionState(action, IDLE);
  useActionResult(state, onDone);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Banner state={state} />

      {mode === "edit" && <input type="hidden" name="id" value={category!.id} />}

      <Field
        label="Slug"
        htmlFor="id"
        required={mode === "create"}
        error={state.errors?.id}
        hint={mode === "create" ? "Used in the menu anchor link. Can't be changed later." : undefined}
      >
        {mode === "create" ? (
          <TextInput id="id" name="id" placeholder="small-plates" defaultValue={state.values?.id} />
        ) : (
          <Badge>{category!.id}</Badge>
        )}
      </Field>

      <Field label="Display title" htmlFor="title" required error={state.errors?.title}>
        <TextInput
          id="title"
          name="title"
          placeholder="SMALL PLATES"
          defaultValue={state.values?.title ?? category?.title}
        />
      </Field>

      <Field label="Sort order" htmlFor="sortOrder" hint="Lower numbers appear first.">
        <TextInput
          id="sortOrder"
          name="sortOrder"
          type="number"
          inputMode="numeric"
          defaultValue={state.values?.sortOrder ?? category?.sortOrder ?? 0}
        />
      </Field>

      <div className="mt-1 flex items-center justify-between gap-3">
        {mode === "edit" ? <DeleteCategoryButton category={category!} onDone={onDone} /> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <SubmitButton>{mode === "create" ? "Add category" : "Save changes"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function DeleteCategoryButton({ category, onDone }: { category: AdminCategory; onDone: () => void }) {
  const [state, formAction] = useActionState(deleteCategory, IDLE);
  useActionResult(state, onDone);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const msg =
          category.itemCount > 0
            ? `Delete “${category.title}” and its ${category.itemCount} dish(es)? This can't be undone.`
            : `Delete “${category.title}”?`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={category.id} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">Delete</SubmitButton>
    </form>
  );
}
