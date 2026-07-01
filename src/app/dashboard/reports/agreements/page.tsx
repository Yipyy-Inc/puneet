import { AgreementsReportClient } from "./_components/agreements-report-client";

export default function AgreementsReportPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agreements Report</h1>
        <p className="text-muted-foreground">
          Facilities with missing or expired legal agreements, by expiry date
        </p>
      </div>

      <AgreementsReportClient />
    </div>
  );
}
