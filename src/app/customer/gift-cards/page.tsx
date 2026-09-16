import { GiftCardsTabs } from "./_components/GiftCardsTabs";
import { GiftCardsHeader } from "./_components/GiftCardsHeader";

// This page named its viewer: `const CUSTOMER_ID = 15` (Alice Johnson) and
// `const FACILITY_ID = 11`, passed straight into the lists. So every signed-in
// owner who opened Gift Cards was shown ALICE'S cards as their own — one of the
// last three screens still doing that, after `/api/clients/me` and
// `useCurrentCustomer()` took the other thirty-two off it.
//
// The viewer is resolved from the session inside the tabs now. This is a server
// component, so it has nobody to name and passes nobody down.

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CustomerGiftCardsPage({
  searchParams,
}: PageProps) {
  // "Check your balance" links from gift-card emails arrive with ?tab=received
  // and land on the Cards I received tab; normal navigation defaults to Send.
  const { tab } = await searchParams;
  const initialTab = tab === "received" ? "received" : "send";

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <GiftCardsHeader />
      <GiftCardsTabs initialTab={initialTab} />
    </div>
  );
}
