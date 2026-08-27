import { BranchPicker } from "@/components/order/BranchPicker";

// Which branches order internally can change at runtime (master flag), so render
// per request rather than freezing at build time.
export const dynamic = "force-dynamic";

export default function OrderPage() {
  return <BranchPicker />;
}
