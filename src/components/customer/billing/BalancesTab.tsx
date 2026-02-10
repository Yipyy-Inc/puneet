"use client";

import { useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { customerCredits, giftCards } from "@/data/payments";
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

  const totalCredits = useMemo(() => {
    return customerCreditsList.reduce((sum, c) => sum + c.remainingAmount, 0);
  }, [customerCreditsList]);

  const totalGiftCardBalance = useMemo(() => {
    return customerGiftCards.reduce((sum, gc) => sum + gc.currentBalance, 0);
  }, [customerGiftCards]);

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

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Account Balances</h2>
        <p className="text-muted-foreground">
          Track your credits and gift card balances
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalCredits)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {customerCreditsList.length} active credit{customerCreditsList.length !== 1 ? "s" : ""}
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
              {customerGiftCards.length} active gift card{customerGiftCards.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credits List */}
      {customerCreditsList.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Credits</h3>
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

      {customerCreditsList.length === 0 && customerGiftCards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-semibold">No active balances</p>
            <p className="text-sm text-muted-foreground">
              Your credits and gift card balances will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
