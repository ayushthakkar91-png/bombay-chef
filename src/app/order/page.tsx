import { getOrderLocations } from "@/lib/repositories/ordering-menu";
import { StartOrder } from "@/components/order/StartOrder";

export default async function OrderPage() {
  const locations = await getOrderLocations();
  return <StartOrder locations={locations} />;
}
