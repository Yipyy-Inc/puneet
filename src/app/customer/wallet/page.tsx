import { WalletView } from "./_components/WalletView";
import { WalletHeader } from "./_components/WalletHeader";

export default function CustomerWalletPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <WalletHeader />
      <WalletView />
    </div>
  );
}
