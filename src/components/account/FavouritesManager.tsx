"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import type { AccountFavourite } from "@/lib/repositories/account";
import { IDLE } from "@/lib/admin/validation";
import { removeFavourite } from "@/app/account/_actions/profile";
import { useActionResult } from "@/components/admin/useActionResult";

const money = (p: number | null) => (p == null ? "" : `£${(p / 100).toFixed(2)}`);

export function FavouritesManager({ favourites }: { favourites: AccountFavourite[] }) {
  if (favourites.length === 0) {
    return (
      <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
        <Heart className="h-7 w-7 text-[#B08A3E]/50 mx-auto mb-3" />
        <p className="font-serif text-[24px] text-[#2B221D] mb-2">No favourites yet</p>
        <p className="text-[#5A524B] font-sans text-[15px] mb-6">Tap the heart on a dish while ordering to save it here.</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[50px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {favourites.map((f) => (
        <div key={f.itemId} className="bg-white border border-[#2A211C]/10 p-5 flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[18px] text-[#2B221D]">{f.name}</p>
            {f.description && <p className="text-[#5A524B] text-[13px] font-sans line-clamp-2 mt-1">{f.description}</p>}
            <div className="flex items-center gap-4 mt-3">
              <span className="font-sans text-[15px] text-[#2B221D]">{money(f.pricePence)}</span>
              <RemoveButton itemId={f.itemId} />
            </div>
          </div>
          {f.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.imageUrl} alt={f.name} className="w-20 h-20 object-cover shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function RemoveButton({ itemId }: { itemId: string }) {
  const [state, action] = useActionState(removeFavourite, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="itemId" value={itemId} />
      <button type="submit" className="inline-flex items-center gap-1.5 text-[#5D0925] text-[12px] uppercase tracking-[0.1em] font-sans hover:opacity-70">
        <Heart className="h-3.5 w-3.5 fill-[#5D0925]" /> Remove
      </button>
    </form>
  );
}
