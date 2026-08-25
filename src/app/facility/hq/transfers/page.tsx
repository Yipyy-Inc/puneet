import { TransferCenterClient } from "@/components/hq/TransferCenterClient";

// The history is the audit trail now -- it used to be `location-transfers.ts`,
// a module-level array that reset on every reload.
export default function HQTransfersPage() {
  return <TransferCenterClient />;
}
