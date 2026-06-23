import { requireCustomer } from "@/lib/auth/customer";
import { listMyFavourites } from "@/lib/repositories/account";
import { FavouritesManager } from "@/components/account/FavouritesManager";

export default async function AccountFavouritesPage() {
  const ctx = await requireCustomer();
  const favourites = await listMyFavourites(ctx.userId);
  return <FavouritesManager favourites={favourites} />;
}
