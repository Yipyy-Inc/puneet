import { HQIntegrationsClient } from "@/components/hq/HQIntegrationsClient";

// The facility comes from the session, through `useSettings` and
// `useFacilityLocations`, both scoped by RLS. It used to be
// `const FACILITY_ID = "11"` right here, which meant every business on the
// platform was shown facility 11's fixture branches while deciding how ITS
// branches map onto ITS books.
export default function HQIntegrationsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Accounting integrations
        </h1>
        <p className="text-muted-foreground text-sm">
          How your branches map onto your books.
        </p>
      </div>
      <HQIntegrationsClient />
    </div>
  );
}
