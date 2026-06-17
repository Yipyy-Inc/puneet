import { MyGiftCardsClient } from "./_components/MyGiftCardsClient";

// Hardcoded facility + current customer for now — replace with context/auth.
const FACILITY_ID = 11;
const CUSTOMER_ID = 15;

export default function MyGiftCardsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Gift Cards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The gift cards you&apos;ve sent and received
        </p>
      </div>
      <MyGiftCardsClient facilityId={FACILITY_ID} customerId={CUSTOMER_ID} />
    </div>
  );
}
