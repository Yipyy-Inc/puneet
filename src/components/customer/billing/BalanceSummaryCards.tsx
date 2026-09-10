"use client";

import { useMemo } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
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
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";

/**
 * The three account-balance cards. Rendered above the billing tab bar so they
 * stay visible regardless of the active tab.
 */
export function BalanceSummaryCards() {
  const { t, locale } = useCustomerText("billing");
  // Canadian dollars, in the reader's locale. This was
  // Intl.NumberFormat("en-US", { currency: "USD" }) — US dollars on a
  // product that takes Canadian ones through Clover.
  const fmt = (n: number) => formatMoney(n, locale);
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility } = useCustomerFacility();

  const totalCredits = useMemo(() => {
    let filtered = customerCredits.filter(
      (c) => c.clientId === customerId && c.status === "active",
    );
    if (selectedFacility)
      filtered = filtered.filter((c) => c.facilityId === selectedFacility.id);
    return filtered.reduce((sum, c) => sum + c.remainingAmount, 0);
  }, [customerId, selectedFacility]);

  const totalGiftCardBalance = useMemo(() => {
    let filtered = giftCards.filter(
      (gc) =>
        (gc.purchasedByClientId === customerId ||
          gc.recipientEmail?.includes("@example.com")) &&
        gc.status === "active",
    );
    if (selectedFacility)
      filtered = filtered.filter((gc) => gc.facilityId === selectedFacility.id);
    return filtered.reduce((sum, gc) => sum + gc.currentBalance, 0);
  }, [customerId, selectedFacility]);

  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter(
          (inv) =>
            inv.clientId === customerId &&
            (inv.status === "sent" || inv.status === "overdue"),
        )
        .reduce((sum, inv) => sum + inv.amountDue, 0),
    [customerId],
  );

  const hasOutstanding = totalOutstanding > 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5" />
            {t("storeCredit")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmt(totalCredits)}</div>
          <Link
            href="/customer/wallet"
            className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {t("manageWallet")} <ArrowRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-5" />
            {t("giftCardBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmt(totalGiftCardBalance)}</div>
          <Link
            href="/customer/gift-cards"
            className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {totalGiftCardBalance > 0
              ? t("manageGiftCards")
              : t("sendGiftCard")}
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
            {t("outstandingBalance")}
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
            {hasOutstanding ? t("outstandingHelp") : t("noOutstanding")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
