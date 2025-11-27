import { PaymentAnalytics } from "@/components/financial/PaymentAnalytics";
import { TransactionsTable } from "@/components/financial/TransactionsTable";
import { PaymentProvidersTable } from "@/components/financial/PaymentProvidersTable";

export default function PaymentIntegrationPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Integration
          </h1>
          <p className="text-muted-foreground">
            Manage payment providers, analyze transactions, and track payment
            performance
          </p>
        </div>

        <PaymentAnalytics />
        <TransactionsTable />
        <PaymentProvidersTable />
      </div>
    </div>
  );
}
