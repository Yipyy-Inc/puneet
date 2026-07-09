"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { customerCredits, giftCards, invoices } from "@/data/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  Gift,
  CreditCard,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

/**
 * The three account-balance cards. Rendered above the billing tab bar so they
 * stay visible regardless of the active tab.
 */
export function BalanceSummaryCards() {
  const { selectedFacility } = useCustomerFacility();

  const totalCredits = useMemo(() => {
    let filtered = customerCredits.filter(
      (c) => c.clientId === MOCK_CUSTOMER_ID && c.status === "active",
    );
    if (selectedFacility)
      filtered = filtered.filter((c) => c.facilityId === selectedFacility.id);
    return filtered.reduce((sum, c) => sum + c.remainingAmount, 0);
  }, [selectedFacility]);

  const totalGiftCardBalance = useMemo(() => {
    let filtered = giftCards.filter(
      (gc) =>
        (gc.purchasedByClientId === MOCK_CUSTOMER_ID ||
          gc.recipientEmail?.includes("@example.com")) &&
        gc.status === "active",
    );
    if (selectedFacility)
      filtered = filtered.filter((gc) => gc.facilityId === selectedFacility.id);
    return filtered.reduce((sum, gc) => sum + gc.currentBalance, 0);
  }, [selectedFacility]);

  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter(
          (inv) =>
            inv.clientId === MOCK_CUSTOMER_ID &&
            (inv.status === "sent" || inv.status === "overdue"),
        )
        .reduce((sum, inv) => sum + inv.amountDue, 0),
    [],
  );

  const hasOutstanding = totalOutstanding > 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5" />
            Store Credit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmt(totalCredits)}</div>
          <Link
            href="/customer/wallet"
            className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Manage wallet <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-5" />
            Gift Card Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmt(totalGiftCardBalance)}</div>
          <Link
            href="/customer/gift-cards"
            className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {totalGiftCardBalance > 0
              ? "Manage gift cards"
              : "Send a gift card"}
            <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card
        className={cn(hasOutstanding && "border-red-300 dark:border-red-800")}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {hasOutstanding ? (
              <AlertTriangle className="size-5 text-red-600" />
            ) : (
              <Wallet className="size-5" />
            )}
            Outstanding Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-3xl font-bold",
              hasOutstanding && "text-red-600",
            )}
          >
            {fmt(totalOutstanding)}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasOutstanding
              ? "From unpaid or overdue invoices."
              : "No outstanding balance."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
