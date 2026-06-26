import { getFinancialReport } from "@/lib/api/financial-report";
import { CreditsLedger } from "./_components/credits-ledger";
import { FeeByFacilityTable } from "./_components/fee-by-facility-table";
import { FinancialKpis } from "./_components/financial-kpis";
import { InvoiceAgingCard } from "./_components/invoice-aging-card";
import { RevenueSummaryTable } from "./_components/revenue-summary-table";
import { TaxSummaryTable } from "./_components/tax-summary-table";

export default function FinancialReportPage() {
  const report = getFinancialReport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Report</h1>
        <p className="text-muted-foreground">
          Platform revenue, receivables, credits, fees, and tax
        </p>
      </div>

      <FinancialKpis kpis={report.kpis} />

      <RevenueSummaryTable
        rows={report.revenue}
        totals={report.revenueTotals}
      />

      <InvoiceAgingCard
        aging={report.aging}
        invoices={report.agingInvoices}
        outstandingTotal={report.outstandingTotal}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreditsLedger rows={report.credits} total={report.creditsTotal} />
        <TaxSummaryTable rows={report.tax} total={report.taxTotal} />
      </div>

      <FeeByFacilityTable matrix={report.fees} />
    </div>
  );
}
