import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { QuickBooksIntegrationView } from "@/components/integrations/quickbooks/QuickBooksIntegrationView";

// Server component — all interactivity lives in the client view below it.
//
// The facility is fixed to the demo facility, matching the rest of the facility
// dashboard. A facility running a separate QuickBooks company per location
// (Section 6B) passes a locationId here; the connection store is already keyed
// for it.
const FACILITY_ID = "11";

export default function QuickBooksIntegrationPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link
        href="/facility/dashboard/settings?section=integrations"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Back to Integrations
      </Link>

      <QuickBooksIntegrationView scope={{ facilityId: FACILITY_ID }} />
    </div>
  );
}
