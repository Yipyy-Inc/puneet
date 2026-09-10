"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PaymentMethodsTab } from "@/components/customer/billing/PaymentMethodsTab";
import { BookingInvoicesTab } from "@/components/customer/billing/BookingInvoicesTab";
import { BalancesTab } from "@/components/customer/billing/BalancesTab";
import { BalanceSummaryCards } from "@/components/customer/billing/BalanceSummaryCards";
import { CreditCard, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";

export default function CustomerBillingPage() {
  const { t } = useCustomerText("billing");
  const [activeTab, setActiveTab] = useState("payment-methods");

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

        {/* Balance cards stay visible above the tabs (Task 36) */}
        <BalanceSummaryCards />

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="payment-methods"
              className="flex items-center gap-2"
            >
              <CreditCard className="size-4" />
              <span className="hidden sm:inline">{t("tabPaymentMethods")}</span>
              <span className="sm:hidden">{t("tabPaymentMethodsShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="size-4" />
              <span className="hidden sm:inline">{t("tabInvoices")}</span>
              <span className="sm:hidden">{t("tabInvoicesShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <Wallet className="size-4" />
              <span className="hidden sm:inline">{t("tabBalances")}</span>
              <span className="sm:hidden">{t("tabBalancesShort")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="space-y-4">
            <PaymentMethodsTab />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <BookingInvoicesTab />
          </TabsContent>

          <TabsContent value="balances" className="space-y-4">
            <BalancesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
