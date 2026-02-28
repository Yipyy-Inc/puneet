"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodsTab } from "@/components/customer/billing/PaymentMethodsTab";
import { InvoicesTab } from "@/components/customer/billing/InvoicesTab";
import { BalancesTab } from "@/components/customer/billing/BalancesTab";
import { CreditCard, FileText, Wallet } from "lucide-react";

export default function CustomerBillingPage() {
  const [activeTab, setActiveTab] = useState("payment-methods");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your payment methods, view invoices, and track your balances
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment-methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Methods</span>
              <span className="sm:hidden">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices & Receipts</span>
              <span className="sm:hidden">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Balances</span>
              <span className="sm:hidden">Balance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="space-y-4">
            <PaymentMethodsTab />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoicesTab />
          </TabsContent>

          <TabsContent value="balances" className="space-y-4">
            <BalancesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
