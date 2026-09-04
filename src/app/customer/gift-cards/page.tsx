import { GiftCardsTabs } from "./_components/GiftCardsTabs";
import { PageHeader } from "@/components/ui/page-header";

// Hardcoded facility + current customer for now — replace with context/auth.
const FACILITY_ID = 11;
const CUSTOMER_ID = 15;

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
      <PageHeader
        title="Gift Cards"
        description="Give the gift of happy pets — beautiful digital gift cards sent straight to the inbox"
      />
      <GiftCardsTabs
        facilityId={FACILITY_ID}
        customerId={CUSTOMER_ID}
        initialTab={initialTab}
      />
    </div>
  );
}
