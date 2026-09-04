import { RedeemFlow } from "./_components/RedeemFlow";
import { PageHeader } from "@/components/ui/page-header";

export default function CustomerRedeemGiftCardPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <PageHeader
        title="Redeem a Gift Card"
        description="Enter your gift card code to add the balance to your wallet — then use it at checkout on any eligible service."
      />
      <RedeemFlow />
    </div>
  );
}
