"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  membershipPlans,
  memberships,
  prepaidCredits,
  servicePackages,
  customerPackagePurchases,
} from "@/data/services-pricing";
import { bookings } from "@/data/bookings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Package, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";
import { ActiveMembershipCard } from "./packages/ActiveMembershipCard";
import { ChangeMembershipDialog } from "./packages/ChangeMembershipDialog";
import { CancelMembershipDialog } from "./packages/CancelMembershipDialog";
import { PurchasedPackageCard } from "./packages/PurchasedPackageCard";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = "15";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function PackagesTab() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Active-membership flows
  const [changeDialog, setChangeDialog] = useState<{
    open: boolean;
    direction: "upgrade" | "downgrade";
    membershipId: string | null;
  }>({ open: false, direction: "upgrade", membershipId: null });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    membershipId: string | null;
  }>({ open: false, membershipId: null });

  const availablePlans = useMemo(
    () => membershipPlans.filter((plan) => plan.isActive),
    [],
  );

  const customerMemberships = useMemo(
    () => memberships.filter((m) => m.customerId === MOCK_CUSTOMER_ID),
    [],
  );

  const customerPrepaidCredits = useMemo(
    () => prepaidCredits.filter((c) => c.customerId === MOCK_CUSTOMER_ID),
    [],
  );

  const customerPackages = useMemo(
    () =>
      customerPackagePurchases.filter((p) => p.customerId === MOCK_CUSTOMER_ID),
    [],
  );

  const getBooking = (id: number) => bookings.find((b) => b.id === id);

  const changeMembership = changeDialog.membershipId
    ? customerMemberships.find((m) => m.id === changeDialog.membershipId)
    : null;
  const changePlan = changeMembership
    ? membershipPlans.find((p) => p.id === changeMembership.planId)
    : undefined;

  const cancelMembership = cancelDialog.membershipId
    ? customerMemberships.find((m) => m.id === cancelDialog.membershipId)
    : null;
  const cancelPlan = cancelMembership
    ? membershipPlans.find((p) => p.id === cancelMembership.planId)
    : undefined;

  const handlePurchasePlan = (planId: string) => {
    setSelectedPlan(planId);
    setIsPurchaseModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    toast.success("Membership purchased successfully!");
    setIsPurchaseModalOpen(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Active Memberships */}
        {customerMemberships.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold">
              Your Active Memberships
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {customerMemberships.map((membership) => {
                const plan = membershipPlans.find(
                  (p) => p.id === membership.planId,
                );
                return (
                  <ActiveMembershipCard
                    key={membership.id}
                    membership={membership}
                    plan={plan}
                    onUpgrade={() =>
                      setChangeDialog({
                        open: true,
                        direction: "upgrade",
                        membershipId: membership.id,
                      })
                    }
                    onDowngrade={() =>
                      setChangeDialog({
                        open: true,
                        direction: "downgrade",
                        membershipId: membership.id,
                      })
                    }
                    onPause={() =>
                      toast.info("Pause request submitted", {
                        description:
                          "Your facility will confirm and apply the pause on your next billing cycle.",
                      })
                    }
                    onCancel={() =>
                      setCancelDialog({
                        open: true,
                        membershipId: membership.id,
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Purchased Packages — pass-level breakdown */}
        {customerPackages.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Your Packages</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {customerPackages.map((purchase) => {
                const pkg = servicePackages.find(
                  (p) => p.id === purchase.packageId,
                );
                return (
                  <PurchasedPackageCard
                    key={purchase.id}
                    purchase={purchase}
                    pkg={pkg}
                    getBooking={getBooking}
                    bookingLinkPrefix="/customer/bookings"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Prepaid Credits */}
        {customerPrepaidCredits.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Prepaid Credits</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {customerPrepaidCredits.map((credit) => (
                <Card key={credit.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="size-5" />
                      Prepaid Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Current Balance:
                      </span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(credit.balance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Purchased:
                      </span>
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
          <h2 className="mb-4 text-2xl font-semibold">
            Available Membership Plans
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => (
              <Card
                key={plan.id}
                className={plan.isPopular ? "ring-primary ring-2" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="size-5" />
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
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.monthlyPrice)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      per month
                    </div>
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
                      <ul className="text-muted-foreground space-y-1 text-sm">
                        {plan.perks.map((perk, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="size-3 text-green-500" />
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
                <p className="text-muted-foreground text-sm">
                  You will be charged monthly. You can cancel anytime.
                </p>
                <div className="flex items-center justify-between font-semibold">
                  <span>Monthly Price:</span>
                  <span>
                    {formatCurrency(
                      membershipPlans.find((p) => p.id === selectedPlan)
                        ?.monthlyPrice || 0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurchaseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPurchase}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade / Downgrade dialog */}
      {changeMembership && (
        <ChangeMembershipDialog
          open={changeDialog.open}
          onOpenChange={(v) =>
            setChangeDialog((prev) => ({ ...prev, open: v }))
          }
          direction={changeDialog.direction}
          membership={changeMembership}
          currentPlan={changePlan}
          allPlans={availablePlans}
          onConfirm={(newPlanId) => {
            const newPlan = availablePlans.find((p) => p.id === newPlanId);
            toast.success(
              `${changeDialog.direction === "upgrade" ? "Upgrade" : "Downgrade"} submitted`,
              {
                description: `Switched to ${newPlan?.name}. ${
                  changeDialog.direction === "upgrade"
                    ? "New perks are active now."
                    : "Takes effect on your next billing cycle."
                }`,
              },
            );
          }}
        />
      )}

      {/* Cancel dialog */}
      {cancelMembership && (
        <CancelMembershipDialog
          open={cancelDialog.open}
          onOpenChange={(v) =>
            setCancelDialog((prev) => ({ ...prev, open: v }))
          }
          membership={cancelMembership}
          plan={cancelPlan}
          onConfirm={() => {
            toast.success("Cancellation scheduled", {
              description:
                "We've emailed you a confirmation with details about your refund and access.",
            });
          }}
        />
      )}
    </>
  );
}
