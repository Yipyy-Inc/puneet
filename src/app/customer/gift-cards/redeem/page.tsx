import { RedeemFlow } from "./_components/RedeemFlow";

export default function CustomerRedeemGiftCardPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Redeem a Gift Card</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter your gift card code to add the balance to your wallet — then use
          it at checkout on any eligible service.
        </p>
      </div>
      <RedeemFlow />
    </div>
  );
}
