"use client";

import { useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { customerCredits, giftCards, invoices } from "@/data/payments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Gift, CreditCard, TrendingUp, Calendar } from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export function BalancesTab() {
  const { selectedFacility } = useCustomerFacility();

  const customerCreditsList = useMemo(() => {
    let filtered = customerCredits.filter((c) => c.clientId === MOCK_CUSTOMER_ID);

    if (selectedFacility) {
      filtered = filtered.filter((c) => c.facilityId === selectedFacility.id);
    }

    return filtered.filter((c) => c.status === "active");
  }, [selectedFacility]);

  const customerGiftCards = useMemo(() => {
    let filtered = giftCards.filter(
      (gc) =>
        gc.purchasedByClientId === MOCK_CUSTOMER_ID ||
        gc.recipientEmail?.includes("@example.com") // Simplified check
    );

    if (selectedFacility) {
      filtered = filtered.filter((gc) => gc.facilityId === selectedFacility.id);
    }

    return filtered.filter((gc) => gc.status === "active");
  }, [selectedFacility]);

  const customerOutstandingInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.clientId === MOCK_CUSTOMER_ID &&
        (inv.status === "sent" || inv.status === "overdue"),
    );
  }, []);

  const totalCredits = useMemo(() => {
    return customerCreditsList.reduce((sum, c) => sum + c.remainingAmount, 0);
  }, [customerCreditsList]);

  const totalGiftCardBalance = useMemo(() => {
    return customerGiftCards.reduce((sum, gc) => sum + gc.currentBalance, 0);
  }, [customerGiftCards]);

  const totalOutstanding = useMemo(() => {
    return customerOutstandingInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  }, [customerOutstandingInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getCreditReasonLabel = (reason: string) => {
    switch (reason) {
      case "refund":
        return "Refund Credit";
      case "promotion":
        return "Promotional Credit";
      case "compensation":
        return "Compensation";
      case "prepaid":
        return "Prepaid Credit";
      default:
        return "Credit";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Build transaction history for credits (credit added / used)
  const creditTransactions = useMemo(() => {
    const tx: {
      id: string;
      type: "added" | "used";
      amount: number;
      description: string;
      date: string;
    }[] = [];

    customerCreditsList.forEach((credit) => {
      tx.push({
        id: `${credit.id}-added`,
        type: "added",
        amount: credit.amount,
        description: credit.description || getCreditReasonLabel(credit.reason),
        date: credit.createdAt,
      });

      if (credit.amount > credit.remainingAmount && credit.lastUsedAt) {
        tx.push({
          id: `${credit.id}-used`,
          type: "used",
          amount: credit.amount - credit.remainingAmount,
          description: `Credit used from ${getCreditReasonLabel(credit.reason)}`,
          date: credit.lastUsedAt,
        });
      }
    });

    return tx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerCreditsList]);

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Account Balances</h2>
        <p className="text-muted-foreground">
          Store credit, gift cards, prepaid balances, and any outstanding amounts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Store Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalCredits)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {customerCreditsList.length} active credit
              {customerCreditsList.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift Card Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalGiftCardBalance)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {customerGiftCards.length} active gift card
              {customerGiftCards.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              From unpaid or overdue invoices (if your facility allows pay-later)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credits List */}
      {customerCreditsList.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Store Credits</h3>
          <div className="space-y-4">
            {customerCreditsList.map((credit) => (
              <Card key={credit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {getCreditReasonLabel(credit.reason)}
                      </CardTitle>
                      <CardDescription>{credit.description}</CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Original Amount</p>
                      <p className="text-lg font-semibold">{formatCurrency(credit.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(credit.remainingAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Used</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(credit.amount - credit.remainingAmount)}
                      </p>
                    </div>
                    {credit.expiryDate && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires
                        </p>
                        <p className="text-sm font-semibold">
                          {formatDate(credit.expiryDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Gift Cards List */}
      {customerGiftCards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Gift Cards</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {customerGiftCards.map((giftCard) => (
              <Card key={giftCard.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        {giftCard.code}
                      </CardTitle>
                      <CardDescription>
                        {giftCard.recipientName || giftCard.purchasedBy}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current Balance:</span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(giftCard.currentBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Initial Amount:</span>
                      <span>{formatCurrency(giftCard.initialAmount)}</span>
                    </div>
                    {giftCard.expiryDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires:
                        </span>
                        <span>{formatDate(giftCard.expiryDate)}</span>
                      </div>
                    )}
                    {giftCard.message && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground italic">
                          "{giftCard.message}"
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History for Credits */}
      {creditTransactions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Credit Transaction History</h3>
          <div className="space-y-2">
            {creditTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm border-b py-2"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className={`h-4 w-4 ${
                      tx.type === "added" ? "text-green-500" : "text-amber-500"
                    }`}
                  />
                  <div>
                    <div className="font-medium">
                      {tx.type === "added" ? "Credit Added" : "Credit Used"}
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      tx.type === "added" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {tx.type === "added" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(tx.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {customerCreditsList.length === 0 &&
        customerGiftCards.length === 0 &&
        customerOutstandingInvoices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="font-semibold">No active balances</p>
              <p className="text-sm text-muted-foreground">
                Your credits, gift card balances, and outstanding amounts will appear here
              </p>
            </CardContent>
          </Card>
        )}
    </>
  );
}
