"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, Flame, Heart } from "lucide-react";

import type { OrderMenuItem } from "@/lib/repositories/ordering-menu";
import type { CartModifier } from "@/lib/ordering/types";
import { toggleFavourite } from "@/app/account/_actions/profile";
import { useOrder } from "./OrderProvider";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export function ItemModal({ item, onClose, isFavourite }: { item: OrderMenuItem; onClose: () => void; isFavourite?: boolean }) {
  const { addLine } = useOrder();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [fav, setFav] = useState(Boolean(isFavourite));
  const [, startFav] = useTransition();

  const onHeart = () => {
    startFav(async () => {
      const res = await toggleFavourite(item.id);
      if (res.needsAuth) {
        router.push("/account/login?next=/order");
        return;
      }
      if (res.ok) setFav(Boolean(res.favourited));
    });
  };
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  // selected[groupId] = Set of modifier ids
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.modifierGroups) {
      const defaults = g.options.filter((o) => o.isDefault).map((o) => o.id);
      init[g.id] = g.maxSelect === 1 && defaults.length === 0 && g.minSelect > 0 ? [g.options[0]?.id].filter(Boolean) : defaults;
    }
    return init;
  });

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const toggle = (groupId: string, optionId: string, maxSelect: number) => {
    setSelected((s) => {
      const cur = s[groupId] ?? [];
      if (maxSelect === 1) return { ...s, [groupId]: [optionId] };
      if (cur.includes(optionId)) return { ...s, [groupId]: cur.filter((x) => x !== optionId) };
      if (cur.length >= maxSelect) return s;
      return { ...s, [groupId]: [...cur, optionId] };
    });
  };

  const chosen: CartModifier[] = useMemo(() => {
    const out: CartModifier[] = [];
    for (const g of item.modifierGroups) {
      for (const id of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === id);
        if (opt) out.push({ id: opt.id, name: opt.name, pricePence: opt.priceDeltaPence });
      }
    }
    return out;
  }, [item.modifierGroups, selected]);

  const unit = item.pricePence + chosen.reduce((s, m) => s + m.pricePence, 0);
  const valid = item.modifierGroups.every((g) => (selected[g.id]?.length ?? 0) >= g.minSelect);

  const add = () => {
    addLine({ itemId: item.id, name: item.name, basePence: item.pricePence, modifiers: chosen, notes: notes.trim() || undefined, qty });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-0 flex h-[100dvh] max-h-none w-full max-w-none flex-col bg-[#F6F2EA] p-0 text-[#2B221D] backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[90vh] sm:w-[min(34rem,calc(100vw-1.5rem))]"
    >
      <div className="relative shrink-0">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-52 w-full object-cover sm:h-44" />
        )}
        <button onClick={onHeart} aria-label={fav ? "Remove favourite" : "Save favourite"} aria-pressed={fav} className="absolute top-3 left-3 bg-[#F6F2EA] rounded-full p-1.5 text-[#5D0925] hover:bg-white">
          <Heart className={`h-5 w-5 ${fav ? "fill-[#5D0925]" : ""}`} />
        </button>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 bg-[#F6F2EA] rounded-full p-1.5 text-[#2B221D] hover:bg-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-6 ${item.imageUrl ? "" : "pt-14"}`}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-serif text-[28px] text-[#2B221D]">{item.name}</h2>
          {item.spiceLevel ? (
            <span className="flex text-[#5D0925]">{Array.from({ length: item.spiceLevel }).map((_, i) => <Flame key={i} className="h-4 w-4" />)}</span>
          ) : null}
        </div>
        {item.description && <p className="text-[#5A524B] font-sans text-[14px] leading-relaxed mb-5">{item.description}</p>}

        {item.modifierGroups.map((g) => (
          <fieldset key={g.id} className="mb-5 border-t border-[#2A211C]/10 pt-4">
            <legend className="font-serif text-[18px] text-[#2B221D]">{g.name}</legend>
            <p className="text-[#5A524B] text-[12px] font-sans mb-3">
              {g.minSelect > 0 ? "Required · " : "Optional · "}
              {g.maxSelect === 1 ? "choose one" : `up to ${g.maxSelect}`}
            </p>
            <div className="flex flex-col gap-2">
              {g.options.map((o) => {
                const isOn = (selected[g.id] ?? []).includes(o.id);
                return (
                  <label key={o.id} className={`flex items-center justify-between px-3 py-2.5 border cursor-pointer transition-colors ${isOn ? "border-[#B08A3E] bg-[#B08A3E]/5" : "border-[#2A211C]/15 hover:border-[#B08A3E]/40"}`}>
                    <span className="flex items-center gap-2.5 text-[15px] font-sans">
                      <input
                        type={g.maxSelect === 1 ? "radio" : "checkbox"}
                        name={g.id}
                        checked={isOn}
                        onChange={() => toggle(g.id, o.id, g.maxSelect)}
                        className="accent-[#B08A3E]"
                      />
                      {o.name}
                    </span>
                    {o.priceDeltaPence > 0 && <span className="text-[#5A524B] text-[14px] font-sans">+{money(o.priceDeltaPence)}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="border-t border-[#2A211C]/10 pt-4">
          <label className="block font-serif text-[18px] text-[#2B221D] mb-2">Special instructions</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Allergies, preferences…"
            className="w-full bg-white border border-[#2A211C]/15 px-3 py-2 text-[14px] font-sans focus:outline-none focus:border-[#B08A3E] resize-none"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-[#2A211C]/10 bg-[#F6F2EA] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center border border-[#2A211C]/20">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="px-3 py-3 hover:text-[#B08A3E]"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-sans text-[16px] tabular-nums">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase" className="px-3 py-3 hover:text-[#B08A3E]"><Plus className="h-4 w-4" /></button>
        </div>
        <button
          onClick={add}
          disabled={!valid}
          className="flex-1 inline-flex items-center justify-center gap-3 h-[52px] bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Add to basket</span>
          <span className="font-sans">{money(unit * qty)}</span>
        </button>
      </div>
    </dialog>
  );
}
