import { HQIntegrationsClient } from "@/components/hq/HQIntegrationsClient";

// Server component — the per-location connection state is client-side (it lives
// in the scope-keyed connection store), so all of it sits below this boundary.
const FACILITY_ID = "11";

export default function HQIntegrationsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Accounting integrations
        </h1>
        <p className="text-muted-foreground text-sm">
          How your locations map onto QuickBooks companies.
        </p>
      </div>
      <HQIntegrationsClient facilityId={FACILITY_ID} />
    </div>
  );
}
