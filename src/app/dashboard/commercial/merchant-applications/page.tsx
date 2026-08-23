import { ReviewQueueClient } from "./_components/review-queue-client";

export default function MerchantApplicationsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Merchant applications</h1>
        <p className="text-muted-foreground text-sm/relaxed">
          Facilities applying for a Yipyy Pay merchant account. Read what they
          sent, ask for anything missing, and record the outcome.
        </p>
      </div>
      <ReviewQueueClient />
    </div>
  );
}
