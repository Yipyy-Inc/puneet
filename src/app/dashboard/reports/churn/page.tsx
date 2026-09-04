import { getChurnReport } from "@/lib/api/churn";
import { ChurnKpis } from "./_components/churn-kpis";
import { ChurnTrendCard } from "./_components/churn-trend-card";
import { ChurnedFacilityLog } from "./_components/churned-facility-log";
import { CohortRetentionTable } from "./_components/cohort-retention-table";
import { PageHeader } from "@/components/ui/page-header";

export default function ChurnReportPage() {
  const { kpis, trend, cohortColumns, cohorts, churnedLog, totals } =
    getChurnReport();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Churn &amp; Retention"
        description="Monthly churn, cohort retention, and lost-revenue analysis"
      />

      <ChurnKpis kpis={kpis} />

      <ChurnTrendCard data={trend} />

      <CohortRetentionTable columns={cohortColumns} cohorts={cohorts} />

      <ChurnedFacilityLog rows={churnedLog} mrrLost={totals.mrrLost} />
    </div>
  );
}
