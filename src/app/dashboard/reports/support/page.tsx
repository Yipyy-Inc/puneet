import { getSupportReport } from "@/lib/api/support-report";
import { SupportReportClient } from "./_components/support-report-client";

export default function SupportReportPage() {
  const report = getSupportReport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Report</h1>
        <p className="text-muted-foreground">
          Unified support analytics across tickets, chat and calls
        </p>
      </div>

      <SupportReportClient report={report} />
    </div>
  );
}
