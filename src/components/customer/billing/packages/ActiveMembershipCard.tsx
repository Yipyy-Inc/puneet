"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Crown,
  ArrowUpCircle,
  ArrowDownCircle,
  PauseCircle,
  XCircle,
  Info,
} from "lucide-react";
import type {
  Membership,
  MembershipPlan,
  MembershipChangePolicy,
} from "@/data/services-pricing";
import { defaultMembershipChangePolicy } from "@/data/services-pricing";

interface Props {
  membership: Membership;
  plan: MembershipPlan | undefined;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onPause: () => void;
  onCancel: () => void;
}

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

function getStatusBadge(status: Membership["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-500">
          Active
        </Badge>
      );
    case "paused":
      return <Badge variant="secondary">Paused</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
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
  const policy: MembershipChangePolicy =
    plan?.changePolicy ?? defaultMembershipChangePolicy;

  const isActive = membership.status === "active";
  const daysFromStart = daysBetween(membership.startDate, nowMs);
  const inCooldown = isActive && daysFromStart < policy.cooldownDays;
  const cooldownRemaining = policy.cooldownDays - daysFromStart;

  const creditsPct =
    membership.creditsTotal > 0
      ? (membership.creditsRemaining / membership.creditsTotal) * 100
      : 100;
  const unlimited = membership.creditsTotal === -1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Crown
                className="size-5"
                style={{ color: plan?.badgeColor ?? "#D4AF37" }}
              />
              {membership.planName}
              {plan?.tierLabel && (
                <Badge variant="outline" className="text-[10px]">
                  {plan.tierLabel}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 capitalize">
              {membership.billingCycle} billing · started{" "}
              {formatDate(membership.startDate)}
            </CardDescription>
          </div>
          {getStatusBadge(membership.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Price</p>
            <p className="text-lg font-semibold">
              {formatCurrency(membership.monthlyPrice)}
              <span className="text-muted-foreground text-xs font-normal">
                {" "}
                / {membership.billingCycle === "monthly" ? "mo" : "cycle"}
              </span>
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Discount</p>
            <p className="text-lg font-semibold text-green-600">
              {membership.discountPercentage}%
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Credits this cycle</span>
            <span className="font-semibold">
              {unlimited
                ? "Unlimited"
                : `${membership.creditsRemaining} / ${membership.creditsTotal}`}
            </span>
          </div>
          {!unlimited && <Progress value={creditsPct} className="h-2" />}
        </div>

        {membership.nextBillingDate && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Next renewal</span>
            <span className="font-medium">
              {formatDate(membership.nextBillingDate)}
            </span>
          </div>
        )}

        {/* Policy box */}
        <div className="bg-muted/20 rounded-lg border p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <Info className="size-3.5" />
            Plan policy
          </div>
          <p className="text-muted-foreground">
            {policy.policyNotes ??
              `Changes apply on your next billing date. ${policy.noticeRequiredDays} days notice required.`}
          </p>
          {inCooldown && (
            <p className="mt-1.5 font-medium text-amber-700">
              Plan changes available in {cooldownRemaining} day
              {cooldownRemaining === 1 ? "" : "s"} (
              {policy.cooldownDays}-day cooldown after signup).
            </p>
          )}
        </div>

        {/* Actions */}
        {isActive && (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <ActionButton
                enabled={policy.allowUpgrade && !inCooldown}
                onClick={onUpgrade}
                disabledReason={
                  !policy.allowUpgrade
                    ? "Upgrades not allowed on this plan"
                    : inCooldown
                      ? `Available in ${cooldownRemaining} days`
                      : undefined
                }
                icon={<ArrowUpCircle className="size-4" />}
                label="Upgrade"
              />
              <ActionButton
                enabled={policy.allowDowngrade && !inCooldown}
                onClick={onDowngrade}
                disabledReason={
                  !policy.allowDowngrade
                    ? "No lower tier available"
                    : inCooldown
                      ? `Available in ${cooldownRemaining} days`
                      : undefined
                }
                icon={<ArrowDownCircle className="size-4" />}
                label="Downgrade"
              />
              <ActionButton
                enabled={policy.allowPause}
                onClick={onPause}
                disabledReason={
                  !policy.allowPause
                    ? "Pause not supported on this plan"
                    : undefined
                }
                icon={<PauseCircle className="size-4" />}
                label="Pause"
                variant="outline"
              />
              <ActionButton
                enabled={policy.allowCancel}
                onClick={onCancel}
                disabledReason={
                  !policy.allowCancel ? "Contact the facility to cancel" : undefined
                }
                icon={<XCircle className="size-4" />}
                label="Cancel"
                variant="outline"
                destructive
              />
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

function ActionButton({
  enabled,
  onClick,
  disabledReason,
  icon,
  label,
  variant = "default",
  destructive = false,
}: {
  enabled: boolean;
  onClick: () => void;
  disabledReason?: string;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "outline";
  destructive?: boolean;
}) {
  const btn = (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={!enabled}
      className={`w-full justify-center gap-1.5 ${
        destructive && enabled ? "text-destructive hover:text-destructive" : ""
      }`}
    >
      {icon}
      {label}
    </Button>
  );
  if (enabled || !disabledReason) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{btn}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
