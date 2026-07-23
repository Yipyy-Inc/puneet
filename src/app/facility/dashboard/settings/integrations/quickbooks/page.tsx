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

export default async function QuickBooksIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  // A facility running a company per location reaches this page per branch,
  // and every store below is scope-keyed — so the same screen configures a
  // different company without knowing anything about locations.
  const { location } = await searchParams;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link
        href={
          location
            ? "/facility/hq/integrations"
            : "/facility/dashboard/settings?section=integrations"
        }
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        {location ? "Back to HQ integrations" : "Back to Integrations"}
      </Link>

      <QuickBooksIntegrationView
        scope={{ facilityId: FACILITY_ID, locationId: location }}
      />
    </div>
  );
}
