"use client";

import { useMemo, useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  membershipPlans,
  memberships,
  prepaidCredits,
} from "@/data/services-pricing";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { useServicePackages } from "@/lib/api/customer-packages";
import { recordToPurchase } from "@/lib/api/mappers/owned-packages";
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
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatMoney, formatPercent } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

/**
 * Why the four membership dialogs no longer report success.
 *
 * All four -- upgrade, downgrade, pause, cancel -- called `toast.success` and
 * nothing else. There is no membership table, no schedule, and no mail: the
 * customer saw "Cancellation scheduled. We've emailed you a confirmation with
 * details about your refund and access", and none of those three things had
 * happened.
 *
 * A customer who believes they have cancelled stops watching their statements,
 * which is the one outcome worth preventing while the schema does not exist.
 *
 * There is nowhere honest to put the request either -- there is no messaging,
 * ticket or request table for a facility, so "we have passed this on" would be
 * the same lie one step removed. So the dialogs say what is true: the request
 * is not recorded, contact the facility. When memberships get a table, the
 * `membershipNotRecorded` catalogue key is the thing to delete: the four call
 * sites are `rg membershipNotRecorded`. (It was a constant, so deleting it
 * failed compilation at every call; it became a key when the page went French
 * on 2026-09-10, and a missing key renders its own name rather than failing,
 * so grep for it.)
 */

/** The catalogue key for a billing cycle's "auto-renews …" cadence. */
function renewalCadenceKey(cycle: string): string {
  switch (cycle) {
    case "weekly":
      return "cadenceWeekly";
    case "quarterly":
      return "cadenceQuarterly";
    case "annually":
    case "yearly":
      return "cadenceYearly";
    default:
      return "cadenceMonthly";
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
  const { t, fill, locale } = useCustomerText("packages");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

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
    () => memberships.filter((m) => m.customerId === String(customerId)),
    [customerId],
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
    () => prepaidCredits.filter((c) => c.customerId === String(customerId)),
    [customerId],
  );

  // From Postgres, scoped to this customer server-side. A pack bought in "Buy
  // Passes & Bundles" appears here because both surfaces read the same rows —
  // the module store they used to share could only agree within one tab.
  // The catalogue, only so a card can show the package's refund/transfer
  // policy beside what the customer owns.
  const { data: catalogue = [] } = useServicePackages();
  const { data: ownedRecords = [] } = useQuery({
    ...groomingQueries.customerPackagesForClient(customerId ?? -1),
    enabled: customerId != null,
  });
  const customerPackages = useMemo(
    () => ownedRecords.map(recordToPurchase),
    [ownedRecords],
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
    toast.success(t("membershipPurchasedSuccessfully"));
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
            title={t("myMemberships")}
            description={t("yourRecurringSubscriptionsStatusBilling")}
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
              {t("noActiveMembership")}
            </p>
          )}
        </section>

        {/* ─── Zone 2 · My Passes ──────────────────────────────────────── */}
        <section>
          <ZoneHeader
            icon={Ticket}
            title={t("myPasses")}
            description={t("prepaidCreditPacksCreditsRemaining")}
            count={customerPackages.length + customerPrepaidCredits.length}
          />
          {customerPackages.length > 0 || customerPrepaidCredits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {customerPackages.map((purchase) => {
                const pkg = catalogue.find((p) => p.id === purchase.packageId);
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
                      {t("prepaidBalance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("currentBalance")}
                      </span>
                      <span className="text-2xl font-bold">
                        {formatMoney(credit.balance, locale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("totalPurchased")}
                      </span>
                      <span>{formatMoney(credit.totalPurchased, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("totalUsed")}
                      </span>
                      <span>{formatMoney(credit.totalUsed, locale)}</span>
                    </div>
                    {credit.expiresAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("expires")}
                        </span>
                        <span>{formatDateLong(credit.expiresAt, locale)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground border-muted rounded-xl border border-dashed px-4 py-6 text-sm">
              {t("noPrepaidPassesYet")}
            </p>
          )}
        </section>

        {/* ─── Zone 2b · Buy prepaid pass bundles ──────────────────────── */}
        <BuyPackagesSection />

        {/* ─── Zone 3 · Explore Plans (marketplace) ────────────────────── */}
        <section className="bg-muted/40 rounded-2xl border p-6 md:p-8">
          <ZoneHeader
            icon={Store}
            title={t("explorePlans")}
            description={t("browseMembershipsAndAddMore")}
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
              {compareOpen ? t("hideComparison") : t("comparePlans")}
            </Button>
          </div>

          {/* Comparison table */}
          {compareOpen && (
            <div className="bg-background mb-4 overflow-x-auto rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground bg-muted/40 sticky left-0 p-3 text-left font-medium">
                      {t("feature")}
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
                              {t("current")}
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
                      {t("monthlyPrice")}
                    </td>
                    {availablePlans.map((plan) => (
                      <td key={plan.id} className="p-3 text-center">
                        {formatMoney(plan.monthlyPrice, locale)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="bg-muted/40 sticky left-0 p-3 font-medium">
                      {t("creditsPerCycleLabel")}
                    </td>
                    {availablePlans.map((plan) => (
                      <td key={plan.id} className="p-3 text-center">
                        {plan.credits === -1 ? t("unlimited") : plan.credits}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="bg-muted/40 sticky left-0 p-3 font-medium">
                      {t("discount")}
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
                            {t("yourCurrentPlan")}
                          </Badge>
                        ) : (
                          plan.isPopular && (
                            <Badge
                              variant="default"
                              className="mt-2 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            >
                              {t("mostPopular")}
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
                        {formatMoney(plan.monthlyPrice, locale)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {t("perMonth")}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("credits")}
                        </span>
                        <span className="font-semibold">{plan.credits}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("discount2")}
                        </span>
                        <span className="font-semibold text-green-600">
                          {plan.discountPercentage}%
                        </span>
                      </div>
                    </div>

                    {plan.perks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{t("perks")}</p>
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
                        {t("yourCurrentPlan")}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handlePurchasePlan(plan.id)}
                      >
                        {t("purchasePlan")}
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
            <DialogTitle>
              {fill("purchasePlanNamed", { plan: purchasePlan?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {t("reviewWhatsIncludedBeforeConfirming")}
            </DialogDescription>
          </DialogHeader>
          {purchasePlan && (
            <div className="space-y-4 py-1 text-sm">
              {/* What you get */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>{t("price")}</span>
                  <span>
                    {formatMoney(purchasePlan.monthlyPrice, locale)}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      /{" "}
                      {purchasePlan.billingCycle === "monthly" ? "mo" : "cycle"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("credits2")}</span>
                  <span className="font-medium">
                    {purchasePlan.credits === -1
                      ? t("unlimited")
                      : fill("creditsPerCycle", { n: purchasePlan.credits })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("discountOnAllServices")}
                  </span>
                  <span className="font-medium text-green-600">
                    {formatPercent(purchasePlan.discountPercentage, locale)}
                  </span>
                </div>
              </div>

              {/* Perks */}
              {purchasePlan.perks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-medium">{t("whatsIncluded")}</p>
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
                    {fill("firstChargeToday", {
                      date: formatDateLong(nowMs, locale),
                    })}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {fill("chargedNowThenRenews", {
                      amount: formatMoney(purchasePlan.monthlyPrice, locale),
                      cadence: t(renewalCadenceKey(purchasePlan.billingCycle)),
                    })}
                  </p>
                </div>
              </div>

              {/* Auto-renewal notice */}
              <p className="text-muted-foreground text-xs">
                {rich(t("autoRenewalNotice"), {
                  policy: (
                    <Link
                      href={
                        purchasePlan.termsUrl ?? "/customer/settings/billing"
                      }
                      className="text-primary font-medium underline"
                    >
                      {t("cancellationPolicy")}
                    </Link>
                  ),
                })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurchaseModalOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirmPurchase}>
              {t("confirmPurchase")}
            </Button>
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
            // NOT "New perks are active now." Nothing switched: memberships
            // have no table, so there is no plan to change and no schedule to
            // put a change on. See the "membershipNotRecorded" note.
            toast.warning(t("notSubmittedYet"), {
              description: `${t("membershipNotRecorded")} ${fill("askAboutPlan", { plan: newPlan?.name ?? t("thisPlan") })}`,
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
            toast.warning(t("notScheduledYet"), {
              description: `${t("membershipNotRecorded")} ${fill("askAboutPlan", { plan: newPlan?.name ?? t("thisPlan") })}`,
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
            toast.warning(t("notScheduledYet"), {
              description: `${t("membershipNotRecorded")} ${fill("askAboutPause", { n: months })}`,
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
            // The worst of the four. "We've emailed you a confirmation" was
            // false twice over -- no cancellation was recorded and no email was
            // sent -- and a customer who believes they have cancelled stops
            // watching their statements.
            toast.warning(t("notCancelledYet"), {
              description: `${t("membershipNotRecorded")} ${t("membershipStillActive")}`,
            });
          }}
        />
      )}
    </>
  );
}
