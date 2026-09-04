import { AgreementsReportClient } from "./_components/agreements-report-client";
import { PageHeader } from "@/components/ui/page-header";

export default function AgreementsReportPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Agreements Report"
        description="Facilities with missing or expired legal agreements, by expiry date"
      />

      <AgreementsReportClient />
    </div>
  );
}
