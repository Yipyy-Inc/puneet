import { getBusinessReport } from "@/lib/api/business-report";
import { BusinessReportClient } from "./_components/business-report-client";

export default function BusinessReportPage() {
  const report = getBusinessReport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Report</h1>
        <p className="text-muted-foreground">
          Recurring-revenue growth, movement, tier mix, and forecast
        </p>
      </div>

      <BusinessReportClient report={report} />
    </div>
  );
}
