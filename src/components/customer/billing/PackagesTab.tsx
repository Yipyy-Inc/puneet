"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { membershipPlans, memberships, prepaidCredits } from "@/data/services-pricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Crown, CreditCard, Check, X } from "lucide-react";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = "15";

export function PackagesTab() {
  const { selectedFacility } = useCustomerFacility();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const availablePlans = useMemo(() => {
    return membershipPlans.filter((plan) => plan.isActive);
  }, []);

  const customerMemberships = useMemo(() => {
    return memberships.filter((m) => m.customerId === MOCK_CUSTOMER_ID);
  }, []);

  const customerPrepaidCredits = useMemo(() => {
    return prepaidCredits.filter((c) => c.customerId === MOCK_CUSTOMER_ID);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handlePurchasePlan = (planId: string) => {
    setSelectedPlan(planId);
    setIsPurchaseModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    // TODO: Integrate with payment processing
    toast.success("Membership purchased successfully!");
    setIsPurchaseModalOpen(false);
    setSelectedPlan(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Active Memberships */}
        {customerMemberships.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">My Memberships</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {customerMemberships.map((membership) => (
                <Card key={membership.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-yellow-500" />
                          {membership.planName}
                        </CardTitle>
                        <CardDescription>
                          {membership.billingCycle} billing
                        </CardDescription>
                      </div>
                      {getStatusBadge(membership.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Price:</span>
                      <span className="font-semibold">{formatCurrency(membership.monthlyPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits Remaining:</span>
                      <span className="font-semibold">
                        {membership.creditsRemaining} / {membership.creditsTotal}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-semibold text-green-600">
                        {membership.discountPercentage}%
                      </span>
                    </div>
                    {membership.nextBillingDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Billing:</span>
                        <span>{formatDate(membership.nextBillingDate)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {membership.autoRenew ? (
                          <>
                            <Check className="h-3 w-3 text-green-500" />
                            Auto-renewal enabled
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 text-muted-foreground" />
                            Auto-renewal disabled
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Prepaid Credits */}
        {customerPrepaidCredits.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Prepaid Credits</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {customerPrepaidCredits.map((credit) => (
                <Card key={credit.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Prepaid Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current Balance:</span>
                      <span className="text-2xl font-bold">{formatCurrency(credit.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Purchased:</span>
                      <span>{formatCurrency(credit.totalPurchased)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Used:</span>
                      <span>{formatCurrency(credit.totalUsed)}</span>
                    </div>
                    {credit.expiresAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires:</span>
                        <span>{formatDate(credit.expiresAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Available Membership Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => (
              <Card key={plan.id} className={plan.isPopular ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {plan.name}
                      </CardTitle>
                      {plan.isPopular && (
                        <Badge variant="default" className="mt-2">
                          Most Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">{formatCurrency(plan.monthlyPrice)}</div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits:</span>
                      <span className="font-semibold">{plan.credits}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-semibold text-green-600">
                        {plan.discountPercentage}%
                      </span>
                    </div>
                  </div>

                  {plan.perks.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Perks:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {plan.perks.map((perk, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-500" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => handlePurchasePlan(plan.id)}
                  >
                    Purchase Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Membership</DialogTitle>
            <DialogDescription>
              {selectedPlan &&
                `Confirm purchase of ${membershipPlans.find((p) => p.id === selectedPlan)?.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You will be charged monthly. You can cancel anytime.
                </p>
                <div className="flex items-center justify-between font-semibold">
                  <span>Monthly Price:</span>
                  <span>
                    {formatCurrency(
                      membershipPlans.find((p) => p.id === selectedPlan)?.monthlyPrice || 0
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPurchase}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
