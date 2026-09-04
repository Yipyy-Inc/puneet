import { getBusinessReport } from "@/lib/api/business-report";
import { BusinessReportClient } from "./_components/business-report-client";
import { PageHeader } from "@/components/ui/page-header";

export default function BusinessReportPage() {
  const report = getBusinessReport();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Business Report"
        description="Recurring-revenue growth, movement, tier mix, and forecast"
      />

      <BusinessReportClient report={report} />
    </div>
  );
}
