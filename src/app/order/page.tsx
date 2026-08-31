import { BranchPicker } from "@/components/order/BranchPicker";

// Static: the picker is built from static branch data + the build-time ordering
// flag (NEXT_PUBLIC_FEATURE_ORDERING), so it can be prerendered and edge-cached.
// Flipping the flag already requires a redeploy, so nothing changes per request.
export default function OrderPage() {
  return <BranchPicker />;
}
