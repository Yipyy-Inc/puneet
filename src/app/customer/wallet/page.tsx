import { WalletView } from "./_components/WalletView";
import { PageHeader } from "@/components/ui/page-header";

export default function CustomerWalletPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="My Wallet"
        description="Your account balance, gift card redemptions, and spending history"
      />
      <WalletView />
    </div>
  );
}
