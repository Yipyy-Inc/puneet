import { ReviewQueueClient } from "./_components/review-queue-client";
import { PageHeader } from "@/components/ui/page-header";

export default function MerchantApplicationsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Merchant applications"
        description="Facilities applying for a Yipyy Pay merchant account. Read what they sent, ask for anything missing, and record the outcome."
      />
      <ReviewQueueClient />
    </div>
  );
}
