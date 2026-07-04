import { GiftCardsTabs } from "./_components/GiftCardsTabs";

// Hardcoded facility + current customer for now — replace with context/auth.
const FACILITY_ID = 11;
const CUSTOMER_ID = 15;

export default function CustomerGiftCardsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gift Cards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Give the gift of happy pets — beautiful digital gift cards sent
          straight to the inbox
        </p>
      </div>
      <GiftCardsTabs facilityId={FACILITY_ID} customerId={CUSTOMER_ID} />
    </div>
  );
}
