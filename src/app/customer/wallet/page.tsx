import { WalletView } from "./_components/WalletView";

export default function CustomerWalletPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your account balance, gift card redemptions, and spending history
        </p>
      </div>
      <WalletView />
    </div>
  );
}
