"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Star, X } from "lucide-react";

import type { AccountAddress } from "@/lib/repositories/account";
import { IDLE } from "@/lib/admin/validation";
import { saveAddress, deleteAddress, setDefaultAddress } from "@/app/account/_actions/profile";
import { useActionResult } from "@/components/admin/useActionResult";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

export function AddressManager({ addresses }: { addresses: AccountAddress[] }) {
  const [editing, setEditing] = useState<AccountAddress | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 h-[46px] px-6 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">
          <Plus className="h-4 w-4" /> Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white border border-[#2A211C]/10 p-10 text-center text-[#5A524B] font-sans text-[15px]">No saved addresses yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white border border-[#2A211C]/10 p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-serif text-[18px] text-[#2B221D]">{a.label || "Address"}</p>
                {a.isDefault && <span className="inline-flex items-center gap-1 text-[#B08A3E] text-[11px] uppercase tracking-[0.1em] font-sans"><Star className="h-3 w-3 fill-[#B08A3E]" /> Default</span>}
              </div>
              <p className="text-[#5A524B] text-[14px] font-sans leading-relaxed">{[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ")}</p>
              <div className="flex items-center gap-3 mt-4 text-[12px] font-sans uppercase tracking-[0.1em]">
                <button onClick={() => setEditing(a)} className="inline-flex items-center gap-1 text-[#2B221D] hover:text-[#B08A3E]"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                {!a.isDefault && <SetDefault id={a.id} />}
                <DeleteAddress id={a.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <AddressDialog address={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AddressDialog({ address, onClose }: { address?: AccountAddress; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(saveAddress, IDLE);
  useActionResult(state, onClose);
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} className="m-auto w-[min(32rem,calc(100vw-1.5rem))] bg-[#F6F2EA] p-0 backdrop:bg-black/50">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A211C]/10">
        <h2 className="font-serif text-[22px] text-[#2B221D]">{address ? "Edit address" : "Add address"}</h2>
        <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[#2B221D]" /></button>
      </div>
      <form action={action} className="p-6 flex flex-col gap-4">
        <AccountBanner state={state} />
        {address && <input type="hidden" name="id" value={address.id} />}
        <input name="label" placeholder="Label (e.g. Home)" defaultValue={state.values?.label ?? address?.label ?? ""} className={accountField} />
        <input name="line1" placeholder="Address line 1" defaultValue={state.values?.line1 ?? address?.line1 ?? ""} className={accountField} />
        <input name="line2" placeholder="Address line 2 (optional)" defaultValue={state.values?.line2 ?? address?.line2 ?? ""} className={accountField} />
        <div className="grid grid-cols-2 gap-4">
          <input name="city" placeholder="City" defaultValue={state.values?.city ?? address?.city ?? ""} className={accountField} />
          <input name="postcode" placeholder="Postcode" defaultValue={state.values?.postcode ?? address?.postcode ?? ""} className={`${accountField} uppercase`} />
        </div>
        <label className="flex items-center gap-2.5 text-[14px] font-sans text-[#5A524B]">
          <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-[#B08A3E]" /> Set as default delivery address
        </label>
        <div className="flex justify-end gap-3 mt-1">
          <button type="button" onClick={onClose} className="px-6 h-[48px] text-[#2B221D] text-[12px] tracking-[0.15em] uppercase font-sans hover:text-[#B08A3E]">Cancel</button>
          <AccountSubmit className="h-[48px]">Save</AccountSubmit>
        </div>
      </form>
    </dialog>
  );
}

function SetDefault({ id }: { id: string }) {
  const [state, action] = useActionState(setDefaultAddress, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-[#5A524B] hover:text-[#B08A3E]">Set default</button>
    </form>
  );
}

function DeleteAddress({ id }: { id: string }) {
  const [state, action] = useActionState(deleteAddress, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove this address?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-[#5D0925] hover:opacity-70">Remove</button>
    </form>
  );
}
