"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  membershipPlans,
  memberships,
  prepaidCredits,
  servicePackages,
} from "@/data/services-pricing";
import { useCustomerPackagePurchases } from "@/lib/customer-package-purchases-store";
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
import {
  Package,
  CreditCard,
  Check,
  Ticket,
  Store,
  Minus,
  Table2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ActiveMembershipCard } from "./packages/ActiveMembershipCard";
import { UpgradeMembershipDialog } from "./packages/UpgradeMembershipDialog";
import { DowngradeMembershipDialog } from "./packages/DowngradeMembershipDialog";
import { PauseMembershipDialog } from "./packages/PauseMembershipDialog";
import { CancelMembershipDialog } from "./packages/CancelMembershipDialog";
import { PurchasedPackageCard } from "./packages/PurchasedPackageCard";
import { BuyPackagesSection } from "./packages/BuyPackagesSection";

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

const formatDateMs = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** Human "auto-renews …" cadence for a billing cycle. */
function renewalCadence(cycle: string): string {
  switch (cycle) {
    case "weekly":
      return "every week";
    case "quarterly":
      return "every 3 months";
    case "annually":
    case "yearly":
      return "every year";
    default:
      return "every month";
  }
}

/** Strong, consistent header for each of the three page zones. */
function ZoneHeader({
  icon: Icon,
  title,
  description,
  count,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {typeof count === "number" && count > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {count}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

export function PackagesTab() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [nowMs] = useState(() => Date.now());
  // Bumped after a pass is redeemed so the mutated remaining-count re-renders.
  const [, setPassVersion] = useState(0);

  // Active-membership flows
  const [changeDialog, setChangeDialog] = useState<{
    open: boolean;
    direction: "upgrade" | "downgrade";
    membershipId: string | null;
  }>({ open: false, direction: "upgrade", membershipId: null });
  const [pauseDialog, setPauseDialog] = useState<{
    open: boolean;
    membershipId: string | null;
  }>({ open: false, membershipId: null });
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

  // Plan IDs the customer is actively subscribed to — used to mark the
  // "Your Current Plan" card and prevent accidental repurchase.
  const currentPlanIds = useMemo(
    () =>
      new Set(
        customerMemberships
          .filter((m) => m.status === "active")
          .map((m) => m.planId),
      ),
    [customerMemberships],
  );

  // Union of every perk across plans, in first-seen order — the rows of the
  // comparison table.
  const allPerks = useMemo(() => {
    const seen = new Set<string>();
    const perks: string[] = [];
    for (const plan of availablePlans) {
      for (const perk of plan.perks) {
        if (!seen.has(perk)) {
          seen.add(perk);
          perks.push(perk);
        }
      }
    }
    return perks;
  }, [availablePlans]);

  const customerPrepaidCredits = useMemo(
    () => prepaidCredits.filter((c) => c.customerId === MOCK_CUSTOMER_ID),
    [],
  );

  // From the live store so a pack bought in "Buy Passes & Bundles" appears here.
  const allPurchases = useCustomerPackagePurchases();
  const customerPackages = useMemo(
    () => allPurchases.filter((p) => p.customerId === MOCK_CUSTOMER_ID),
    [allPurchases],
  );

  const getBooking = (id: number) => bookings.find((b) => b.id === id);

  const purchasePlan = selectedPlan
    ? membershipPlans.find((p) => p.id === selectedPlan)
    : undefined;

  const changeMembership = changeDialog.membershipId
    ? customerMemberships.find((m) => m.id === changeDialog.membershipId)
    : null;
  const changePlan = changeMembership
    ? membershipPlans.find((p) => p.id === changeMembership.planId)
    : undefined;

  const pauseMembership = pauseDialog.membershipId
    ? customerMemberships.find((m) => m.id === pauseDialog.membershipId)
    : null;
  const pausePlan = pauseMembership
    ? membershipPlans.find((p) => p.id === pauseMembership.planId)
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
      <div className="space-y-10">
        {/* ─── Zone 1 · My Memberships ─────────────────────────────────── */}
        <section>
          <ZoneHeader
            icon={CreditCard}
            title="My Memberships"
            description="Your recurring subscriptions — status, billing and self-service."
            count={customerMemberships.length}
          />
          {customerMemberships.length > 0 ? (
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
                      setPauseDialog({
                        open: true,
                        membershipId: membership.id,
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
          ) : (
            <p className="text-muted-foreground border-muted rounded-xl border border-dashed px-4 py-6 text-sm">
              You don&apos;t have an active membership. Explore plans below to
              start saving on every visit.
            </p>
          )}
        </section>

        {/* ─── Zone 2 · My Passes ──────────────────────────────────────── */}
        <section>
          <ZoneHeader
            icon={Ticket}
            title="My Passes"
            description="Prepaid credit packs — credits remaining, expiry and quick-book."
            count={customerPackages.length + customerPrepaidCredits.length}
          />
          {customerPackages.length > 0 || customerPrepaidCredits.length > 0 ? (
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
                    onRedeemed={() => setPassVersion((v) => v + 1)}
                  />
                );
              })}
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
          ) : (
            <p className="text-muted-foreground border-muted rounded-xl border border-dashed px-4 py-6 text-sm">
              No prepaid passes yet. Buy a credit pack to save on bundled
              visits.
            </p>
          )}
        </section>

        {/* ─── Zone 2b · Buy prepaid pass bundles ──────────────────────── */}
        <BuyPackagesSection />

        {/* ─── Zone 3 · Explore Plans (marketplace) ────────────────────── */}
        <section className="bg-muted/40 rounded-2xl border p-6 md:p-8">
          <ZoneHeader
            icon={Store}
            title="Explore Plans"
            description="Browse memberships and add more savings and perks — this is the shop."
          />

          {/* Compare plans toggle */}
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setCompareOpen((v) => !v)}
              aria-pressed={compareOpen}
            >
              <Table2 className="size-4" />
              {compareOpen ? "Hide comparison" : "Compare plans"}
            </Button>
          </div>

          {/* Comparison table */}
          {compareOpen && (
            <div className="bg-background mb-4 overflow-x-auto rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground bg-muted/40 sticky left-0 p-3 text-left font-medium">
                      Feature
                    </th>
                    {availablePlans.map((plan) => (
                      <th
                        key={plan.id}
                        className="min-w-32 p-3 text-center align-bottom"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold">{plan.name}</span>
                          {currentPlanIds.has(plan.id) && (
                            <Badge
                              variant="default"
                              className="gap-1 bg-emerald-600 text-[10px] hover:bg-emerald-600"
                            >
                              <Check className="size-2.5" />
                              Current
                            </Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="bg-muted/40 sticky left-0 p-3 font-medium">
                      Monthly price
                    </td>
                    {availablePlans.map((plan) => (
                      <td key={plan.id} className="p-3 text-center">
                        {formatCurrency(plan.monthlyPrice)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="bg-muted/40 sticky left-0 p-3 font-medium">
                      Credits / cycle
                    </td>
                    {availablePlans.map((plan) => (
                      <td key={plan.id} className="p-3 text-center">
                        {plan.credits === -1 ? "Unlimited" : plan.credits}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="bg-muted/40 sticky left-0 p-3 font-medium">
                      Discount
                    </td>
                    {availablePlans.map((plan) => (
                      <td
                        key={plan.id}
                        className="p-3 text-center font-medium text-green-600"
                      >
                        {plan.discountPercentage}%
                      </td>
                    ))}
                  </tr>
                  {allPerks.map((perk) => (
                    <tr key={perk} className="border-b last:border-b-0">
                      <td className="bg-muted/40 text-muted-foreground sticky left-0 p-3">
                        {perk}
                      </td>
                      {availablePlans.map((plan) => (
                        <td key={plan.id} className="p-3 text-center">
                          {plan.perks.includes(perk) ? (
                            <Check className="mx-auto size-4 text-green-600" />
                          ) : (
                            <Minus className="text-muted-foreground/50 mx-auto size-4" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => {
              const isCurrent = currentPlanIds.has(plan.id);
              return (
                <Card
                  key={plan.id}
                  className={
                    isCurrent
                      ? "ring-primary bg-primary/5 ring-2"
                      : plan.isPopular
                        ? "ring-primary bg-background ring-2"
                        : "bg-background"
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="size-5" />
                          {plan.name}
                        </CardTitle>
                        {isCurrent ? (
                          <Badge
                            variant="default"
                            className="mt-2 gap-1 bg-emerald-600 hover:bg-emerald-600"
                          >
                            <Check className="size-3" />
                            Your Current Plan
                          </Badge>
                        ) : (
                          plan.isPopular && (
                            <Badge
                              variant="default"
                              className="mt-2 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            >
                              Most Popular
                            </Badge>
                          )
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

                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        disabled
                      >
                        <Check className="size-4" />
                        Your Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handlePurchasePlan(plan.id)}
                      >
                        Purchase Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase {purchasePlan?.name}</DialogTitle>
            <DialogDescription>
              Review what&apos;s included before confirming your membership.
            </DialogDescription>
          </DialogHeader>
          {purchasePlan && (
            <div className="space-y-4 py-1 text-sm">
              {/* What you get */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>Price</span>
                  <span>
                    {formatCurrency(purchasePlan.monthlyPrice)}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      /{" "}
                      {purchasePlan.billingCycle === "monthly" ? "mo" : "cycle"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-medium">
                    {purchasePlan.credits === -1
                      ? "Unlimited"
                      : `${purchasePlan.credits} / cycle`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Discount on all services
                  </span>
                  <span className="font-medium text-green-600">
                    {purchasePlan.discountPercentage}%
                  </span>
                </div>
              </div>

              {/* Perks */}
              {purchasePlan.perks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-medium">What&apos;s included</p>
                  <ul className="space-y-1">
                    {purchasePlan.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="size-3.5 shrink-0 text-green-500" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* First charge */}
              <div className="bg-muted/30 flex items-start gap-2 rounded-lg border p-3">
                <CreditCard className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    First charge today — {formatDateMs(nowMs)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatCurrency(purchasePlan.monthlyPrice)} charged now,
                    then auto-renews {renewalCadence(purchasePlan.billingCycle)}
                    .
                  </p>
                </div>
              </div>

              {/* Auto-renewal notice */}
              <p className="text-muted-foreground text-xs">
                By confirming you agree to auto-renewal. Cancel anytime — see
                our{" "}
                <Link
                  href={purchasePlan.termsUrl ?? "/customer/settings/billing"}
                  className="text-primary font-medium underline"
                >
                  cancellation policy
                </Link>
                .
              </p>
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

      {/* Upgrade dialog */}
      {changeMembership && changeDialog.direction === "upgrade" && (
        <UpgradeMembershipDialog
          open={changeDialog.open}
          onOpenChange={(v) =>
            setChangeDialog((prev) => ({ ...prev, open: v }))
          }
          membership={changeMembership}
          currentPlan={changePlan}
          allPlans={availablePlans}
          onConfirm={(newPlanId) => {
            const newPlan = availablePlans.find((p) => p.id === newPlanId);
            toast.success("Upgrade submitted", {
              description: `Switched to ${newPlan?.name}. New perks are active now.`,
            });
          }}
        />
      )}

      {/* Downgrade dialog */}
      {changeMembership && changeDialog.direction === "downgrade" && (
        <DowngradeMembershipDialog
          open={changeDialog.open}
          onOpenChange={(v) =>
            setChangeDialog((prev) => ({ ...prev, open: v }))
          }
          membership={changeMembership}
          currentPlan={changePlan}
          allPlans={availablePlans}
          onConfirm={(newPlanId) => {
            const newPlan = availablePlans.find((p) => p.id === newPlanId);
            toast.success("Downgrade scheduled", {
              description: `You'll switch to ${newPlan?.name} on your next billing cycle.`,
            });
          }}
        />
      )}

      {/* Pause dialog */}
      {pauseMembership && (
        <PauseMembershipDialog
          open={pauseDialog.open}
          onOpenChange={(v) => setPauseDialog((prev) => ({ ...prev, open: v }))}
          membership={pauseMembership}
          plan={pausePlan}
          onConfirm={(months) => {
            toast.success("Pause scheduled", {
              description: `Your membership will pause for ${months} month${
                months === 1 ? "" : "s"
              } from your next billing date.`,
            });
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
