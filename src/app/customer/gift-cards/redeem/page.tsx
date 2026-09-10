import { RedeemFlow } from "./_components/RedeemFlow";
import { RedeemHeader } from "./_components/RedeemHeader";

export default function CustomerRedeemGiftCardPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <RedeemHeader />
      <RedeemFlow />
    </div>
  );
}
