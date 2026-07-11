"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Crown,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  PauseCircle,
  XCircle,
  Sparkles,
  Calendar,
  CreditCard,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import type {
  Membership,
  MembershipPlan,
  MembershipChangePolicy,
} from "@/data/services-pricing";
import { defaultMembershipChangePolicy } from "@/data/services-pricing";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clients } from "@/data/clients";

interface Props {
  membership: Membership;
  plan: MembershipPlan | undefined;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onPause: () => void;
  onCancel: () => void;
}

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** Warm-gold / slate / teal banner treatment keyed off the membership tier. */
function getTierTheme(tierLabel: string | undefined, planName: string) {
  const key = `${tierLabel ?? ""} ${planName}`.toLowerCase();
  if (key.includes("gold") || key.includes("platinum")) {
    return {
      background:
        "linear-gradient(135deg, #b8860b 0%, #f0c75e 45%, #d4a017 100%)",
      foreground: "#3a2c00",
      chipBg: "rgba(58,44,0,0.14)",
    };
  }
  if (key.includes("silver")) {
    return {
      background:
        "linear-gradient(135deg, #475569 0%, #94a3b8 50%, #64748b 100%)",
      foreground: "#ffffff",
      chipBg: "rgba(255,255,255,0.18)",
    };
  }
  // Standard (and any other tier) → teal
  return {
    background:
      "linear-gradient(135deg, #0f766e 0%, #14b8a6 55%, #0d9488 100%)",
    foreground: "#ffffff",
    chipBg: "rgba(255,255,255,0.18)",
  };
}

function getStatusChipLabel(status: Membership["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    case "pending":
      return "Pending";
  }
}

function daysBetween(fromIso: string, nowMs: number): number {
  const ms = nowMs - new Date(fromIso).getTime();
  return Math.floor(ms / 86_400_000);
}

export function ActiveMembershipCard({
  membership,
  plan,
  onUpgrade,
  onDowngrade,
  onPause,
  onCancel,
}: Props) {
  const [nowMs] = useState(() => Date.now());
  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();
  const customer = useMemo(
    () => clients.find((client) => client.id === MOCK_CUSTOMER_ID),
    [],
  );

  const policy: MembershipChangePolicy =
    plan?.changePolicy ?? defaultMembershipChangePolicy;

  const isActive = membership.status === "active";
  const daysFromStart = daysBetween(membership.startDate, nowMs);
  const inCooldown = isActive && daysFromStart < policy.cooldownDays;
  const cooldownRemaining = policy.cooldownDays - daysFromStart;

  const theme = getTierTheme(plan?.tierLabel, membership.planName);

  // Credits used this cycle — prefer the per-cycle fields, fall back to the
  // remaining/total pair for older membership records.
  const cycleTotal = membership.creditsPerCycle ?? membership.creditsTotal;
  const unlimited = cycleTotal === -1;
  const creditsUsed =
    membership.creditsUsedThisCycle ??
    Math.max(0, cycleTotal - membership.creditsRemaining);
  const creditsLeft = unlimited
    ? Infinity
    : Math.max(0, cycleTotal - creditsUsed);
  const usedPct =
    !unlimited && cycleTotal > 0
      ? Math.min(100, Math.max(0, (creditsUsed / cycleTotal) * 100))
      : 0;
  // Bar colour is driven by how many credits remain: teal → amber → red.
  const barColor =
    creditsLeft <= 0 ? "#dc2626" : creditsLeft <= 2 ? "#f59e0b" : "#0d9488";

  const canBook = isActive && (unlimited || creditsLeft > 0);

  // Pre-filter the booking flow when the plan is valid for a single service.
  const soleService =
    plan?.applicableServices?.length === 1
      ? plan.applicableServices[0]
      : undefined;

  const handleBookWithCredits = () => {
    if (!selectedFacility || !customer) return;
    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      preSelectedService: soleService,
      lockService: soleService !== undefined,
      isCustomerMode: true,
      onCreateBooking: () => {
        // Modal stays open to show the booking request confirmation screen.
      },
    });
  };

  const inactiveReason = !isActive
    ? `Membership is ${membership.status}`
    : undefined;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Coloured tier banner */}
      <div
        className="px-5 py-4"
        style={{ background: theme.background, color: theme.foreground }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Crown className="size-5 shrink-0" />
              <h3 className="truncate text-lg font-semibold">
                {membership.planName}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {plan?.tierLabel && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: theme.chipBg }}
                >
                  {plan.tierLabel}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: theme.chipBg }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      membership.status === "active"
                        ? "#22c55e"
                        : membership.status === "paused"
                          ? "#eab308"
                          : "#ef4444",
                  }}
                />
                {getStatusChipLabel(membership.status)}
              </span>
            </div>
          </div>

          {/* Management actions live entirely in this menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 hover:bg-white/20"
                style={{ color: theme.foreground }}
              >
                <MoreHorizontal className="size-5" />
                <span className="sr-only">Membership actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Manage membership</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <MenuAction
                icon={ArrowUpCircle}
                label="Upgrade plan"
                onClick={onUpgrade}
                enabled={isActive && policy.allowUpgrade && !inCooldown}
                reason={
                  inactiveReason ??
                  (!policy.allowUpgrade
                    ? "Upgrades not allowed on this plan"
                    : inCooldown
                      ? `Available in ${cooldownRemaining} day${cooldownRemaining === 1 ? "" : "s"}`
                      : undefined)
                }
              />
              <MenuAction
                icon={ArrowDownCircle}
                label="Downgrade plan"
                onClick={onDowngrade}
                enabled={isActive && policy.allowDowngrade && !inCooldown}
                reason={
                  inactiveReason ??
                  (!policy.allowDowngrade
                    ? "No lower tier available"
                    : inCooldown
                      ? `Available in ${cooldownRemaining} day${cooldownRemaining === 1 ? "" : "s"}`
                      : undefined)
                }
              />
              <MenuAction
                icon={PauseCircle}
                label="Pause membership"
                onClick={onPause}
                enabled={isActive && policy.allowPause}
                reason={
                  inactiveReason ??
                  (!policy.allowPause
                    ? "Pause not supported on this plan"
                    : undefined)
                }
              />
              <DropdownMenuSeparator />
              <MenuAction
                icon={XCircle}
                label="Cancel membership"
                onClick={onCancel}
                enabled={isActive && policy.allowCancel}
                reason={
                  inactiveReason ??
                  (!policy.allowCancel
                    ? "Contact the facility to cancel"
                    : undefined)
                }
                destructive
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-5">
        {/* Failed auto-payment banner */}
        {membership.autoPayment?.status === "failed" && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="space-y-2">
              <p className="font-semibold text-red-700 dark:text-red-300">
                Payment failed
              </p>
              <p className="text-red-700/90 dark:text-red-300/90">
                We couldn&apos;t charge your{" "}
                {membership.autoPayment.methodBrand} ending{" "}
                {membership.autoPayment.last4}. We&apos;ve emailed you — update
                your payment method to keep your membership active.
              </p>
              <Button size="sm" variant="destructive" asChild>
                <Link href="/customer/billing">Update payment method</Link>
              </Button>
            </div>
          </div>
        )}

        {/* 3-stat row */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Monthly Price"
            value={formatCurrency(membership.monthlyPrice)}
          />
          <Stat label="Member Since" value={formatDate(membership.startDate)} />
          <Stat
            label="Next Renewal"
            value={
              membership.nextBillingDate
                ? formatDate(membership.nextBillingDate)
                : "—"
            }
          />
        </div>

        {/* Credits used this cycle */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Credits used this cycle
            </span>
            <span className="font-semibold">
              {unlimited ? "Unlimited" : `${creditsUsed}/${cycleTotal}`}
            </span>
          </div>
          {!unlimited && (
            <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${usedPct}%`, backgroundColor: barColor }}
              />
            </div>
          )}
          {!unlimited && (
            <p className="text-muted-foreground mt-1 text-xs">
              {creditsLeft} credit{creditsLeft === 1 ? "" : "s"} remaining
            </p>
          )}
          {membership.rolloverCredits != null &&
            membership.rolloverCredits > 0 && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300">
                <RotateCcw className="size-3.5" />
                Rollover credits: {membership.rolloverCredits} carrying forward
              </p>
            )}
        </div>

        {/* Discount chip */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <Sparkles className="size-3.5" />
          {membership.discountPercentage}% off all services
        </div>

        {/* Auto-payment row (active) */}
        {membership.autoPayment &&
          membership.autoPayment.status !== "failed" && (
            <div className="bg-muted/20 rounded-lg border p-3 text-xs">
              <p className="text-muted-foreground">
                Your membership renews automatically on{" "}
                <span className="text-foreground font-medium">
                  {formatDate(membership.autoPayment.nextRenewalDate)}
                </span>{" "}
                for{" "}
                <span className="text-foreground font-medium">
                  {formatCurrency(membership.autoPayment.renewalAmount)}
                </span>
                .
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CreditCard className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground">Payment method:</span>
                <span className="text-foreground font-medium">
                  {membership.autoPayment.methodBrand} ending{" "}
                  {membership.autoPayment.last4}
                </span>
                <Link
                  href="/customer/billing"
                  className="text-primary ml-auto font-medium hover:underline"
                >
                  Update
                </Link>
              </div>
            </div>
          )}

        {/* Primary CTA */}
        <Button
          className="w-full gap-2"
          onClick={handleBookWithCredits}
          disabled={!canBook || !selectedFacility || !customer}
        >
          <Calendar className="size-4" />
          Book with Credits
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  enabled,
  reason,
  destructive = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  enabled: boolean;
  reason?: string;
  destructive?: boolean;
}) {
  return (
    <DropdownMenuItem
      disabled={!enabled}
      onSelect={enabled ? onClick : undefined}
      className={
        destructive && enabled
          ? "text-destructive focus:text-destructive"
          : undefined
      }
    >
      <Icon className="mr-2 size-4" />
      <div className="flex min-w-0 flex-col">
        <span>{label}</span>
        {!enabled && reason && (
          <span className="text-muted-foreground text-[11px]">{reason}</span>
        )}
      </div>
    </DropdownMenuItem>
  );
}
