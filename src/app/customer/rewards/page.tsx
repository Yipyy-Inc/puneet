"use client";

import { useMemo, useState, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Gift,
  Star,
  TrendingUp,
  Users,
  Copy,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ExternalLink,
  Info,
  Loader2,
  DollarSign,
  Wallet,
  Percent,
  CreditCard,
  ArrowRight,
  Lock,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customerLoyaltyData,
  loyaltySettings,
  referralCodes,
  badges,
  loyaltyRewards,
  type LoyaltyReward,
} from "@/data/marketing";
import { buildDefaultEarnRules } from "@/data/facility-loyalty-config";
import {
  earnRuleCustomerSummary,
  activeCustomerEarnRules,
} from "@/lib/loyalty/earn-rule-summary";
import {
  buildRewardsWallet,
  type WalletIcon,
  type WalletReward,
} from "@/lib/loyalty/rewards-wallet";
import Link from "next/link";
import { payments } from "@/data/payments";
import { useQuery } from "@tanstack/react-query";
import { loyaltyQueries } from "@/lib/api/loyalty";
import {
  badgeConditionText,
  badgeRewardText,
} from "@/lib/loyalty/badge-summary";
import { badgeCriteriaMet, type BadgeStats } from "@/lib/loyalty/engine-badges";
import { badgeProgress } from "@/lib/loyalty/badge-progress";
import { RedeemPointsDialog } from "@/components/customer/RedeemPointsDialog";
import { LoyaltyTransactionHistory } from "@/components/loyalty/LoyaltyTransactionHistory";
import { BadgeCelebration } from "@/components/customer/BadgeCelebration";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

// Captured once at module load for deterministic expiry math (gated behind
// isMounted at render time to avoid SSR hydration mismatch).
const NOW_MS = Date.now();

const WALLET_ICONS: Record<WalletIcon, LucideIcon> = {
  credit: DollarSign,
  discount: Percent,
  gift_card: CreditCard,
  freebie: Gift,
};

export default function CustomerRewardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(
    null,
  );
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [pointsRedeemOpen, setPointsRedeemOpen] = useState(false);
  const [useRewardTarget, setUseRewardTarget] = useState<WalletReward | null>(
    null,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Live loyalty account (the engine model) — authoritative for points, credit,
  // and tier. Falls back to the legacy display model until it loads.
  const loyaltyFacilityId = selectedFacility?.id ?? 0;
  const { data: loyaltyAccount } = useQuery({
    ...loyaltyQueries.account(loyaltyFacilityId, MOCK_CUSTOMER_ID),
    enabled: !!selectedFacility,
  });
  const { data: facilityLoyaltyConfig } = useQuery({
    ...loyaltyQueries.facilityConfig(loyaltyFacilityId),
    enabled: !!selectedFacility,
  });
  const redemptionRate = facilityLoyaltyConfig?.redemptionRate ?? 100;
  const minimumRedemptionPoints =
    facilityLoyaltyConfig?.settings?.minimumRedemptionPoints ?? 100;

  // Active earn rules drive the dynamic "How Points Are Earned" list so it always
  // mirrors the facility's current EarnRule config. Falls back to the defaults
  // when a facility hasn't customised its rules yet.
  const earnRules = useMemo(() => {
    const rules =
      facilityLoyaltyConfig?.earnRules &&
      facilityLoyaltyConfig.earnRules.length > 0
        ? facilityLoyaltyConfig.earnRules
        : buildDefaultEarnRules(loyaltyFacilityId);
    return activeCustomerEarnRules(rules);
  }, [facilityLoyaltyConfig, loyaltyFacilityId]);

  // Rewards wallet — the customer's active, unused RewardRedemptions. Keyed under
  // ["loyalty"] so redeeming points (which creates a record) refreshes it.
  const { data: activeRewards = [] } = useQuery({
    ...loyaltyQueries.customerRewards(loyaltyFacilityId, MOCK_CUSTOMER_ID),
    enabled: !!selectedFacility,
  });
  const walletRewards = useMemo(
    () => buildRewardsWallet(activeRewards, NOW_MS),
    [activeRewards],
  );

  // Full points-transaction history (canonical LoyaltyTransactions) for the
  // "My History" tab — earned / redeemed / adjusted / expired with running balance.
  const { data: pointTransactions = [] } = useQuery({
    ...loyaltyQueries.transactions(loyaltyFacilityId, MOCK_CUSTOMER_ID),
    enabled: !!selectedFacility,
  });

  // Lifetime points = cumulative total of ALL points ever earned (positive
  // ledger entries), not net of redemptions.
  const lifetimePoints = useMemo(
    () =>
      pointTransactions
        .filter((t) => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0),
    [pointTransactions],
  );

  // Get loyalty data
  const loyaltyData = useMemo(() => {
    const customerLoyalty = customerLoyaltyData.find(
      (l) => l.clientId === MOCK_CUSTOMER_ID,
    );
    if (!customerLoyalty) return null;

    // Prefer the live engine account (points / tier / credit are kept in sync by
    // the automation engine); the tier ids match loyaltySettings.tiers.
    const points = loyaltyAccount?.pointsBalance ?? customerLoyalty.points;
    const tierId = loyaltyAccount?.currentTierId ?? customerLoyalty.tier;
    const creditBalance = loyaltyAccount?.creditBalance ?? 0;

    const currentTier = loyaltySettings.tiers.find((t) => t.id === tierId);
    const nextTier = loyaltySettings.tiers.find((t) => t.minPoints > points);
    const pointsToNextTier = nextTier ? nextTier.minPoints - points : 0;
    const currentTierMaxPoints = nextTier ? nextTier.minPoints : Infinity;
    const currentTierMinPoints = currentTier?.minPoints || 0;
    const progressInTier = points - currentTierMinPoints;
    const tierRange = currentTierMaxPoints - currentTierMinPoints;
    const progressPercentage =
      tierRange > 0 ? (progressInTier / tierRange) * 100 : 0;

    return {
      ...customerLoyalty,
      points,
      tier: tierId,
      creditBalance,
      currentTier,
      nextTier,
      pointsToNextTier,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    };
  }, [loyaltyAccount]);

  // Get referral codes for this customer
  const customerReferralCodes = useMemo(() => {
    return referralCodes.filter((ref) => ref.referrerId === MOCK_CUSTOMER_ID);
  }, []);

  // Get customer payments to calculate total spent
  const customerPayments = useMemo(() => {
    if (!selectedFacility) return [];
    return payments.filter(
      (p) =>
        p.clientId === MOCK_CUSTOMER_ID &&
        p.facilityId === selectedFacility.id &&
        p.status === "completed",
    );
  }, [selectedFacility]);

  const totalSpent = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [customerPayments]);

  // Earned (CustomerBadge records) + in-progress badges, evaluated against the
  // canonical loyalty account stats via the same engine criteria the automation
  // uses. Earned = has a record OR currently meets the criteria.
  const { data: customerBadges = [] } = useQuery({
    ...loyaltyQueries.customerBadges(loyaltyFacilityId, MOCK_CUSTOMER_ID),
    enabled: !!selectedFacility,
  });

  const badgeView = useMemo(() => {
    const facilityBadges =
      facilityLoyaltyConfig?.badges && facilityLoyaltyConfig.badges.length > 0
        ? facilityLoyaltyConfig.badges
        : badges;
    const tiers = facilityLoyaltyConfig?.tierDefinitions ?? [];
    const stats: BadgeStats = {
      bookingsCount: loyaltyAccount?.totalVisits ?? 0,
      totalSpent: loyaltyAccount?.totalSpend ?? 0,
      referrals: loyaltyAccount?.referralCount ?? 0,
      reviews: loyaltyAccount?.reviewCount ?? 0,
      currentTier:
        tiers.find((t) => t.id === loyaltyAccount?.currentTierId) ?? null,
    };
    const earnedAtById = new Map(
      customerBadges.map((cb) => [cb.badgeId, cb.earnedAt]),
    );

    const earned: {
      badge: (typeof facilityBadges)[number];
      earnedAt: string | null;
    }[] = [];
    const inProgress: {
      badge: (typeof facilityBadges)[number];
      progress: ReturnType<typeof badgeProgress>;
    }[] = [];

    for (const badge of facilityBadges) {
      if (badge.enabled === false) continue;
      const earnedAt = earnedAtById.get(badge.id) ?? null;
      const isEarned =
        earnedAt != null || badgeCriteriaMet(badge, stats, tiers);
      if (isEarned) {
        earned.push({ badge, earnedAt });
      } else {
        inProgress.push({
          badge,
          progress: badgeProgress(badge, stats, tiers),
        });
      }
    }

    earned.sort(
      (a, b) => (a.earnedAt ?? "").localeCompare(b.earnedAt ?? "") * -1,
    );
    inProgress.sort((a, b) => b.progress.ratio - a.progress.ratio);
    return { earned, inProgress };
  }, [facilityLoyaltyConfig, loyaltyAccount, customerBadges]);

  // Celebrate badges earned since the customer last visited (tracked in
  // localStorage). The celebration is shown by id; the badge is looked up at
  // render so the effect only manages a string + persistence.
  const earnedKey = useMemo(
    () => badgeView.earned.map((e) => e.badge.id).join(","),
    [badgeView],
  );
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  useEffect(() => {
    if (!isMounted) return;
    const ids = earnedKey ? earnedKey.split(",") : [];
    if (ids.length === 0) return;
    const key = `seen-badges-${loyaltyFacilityId}-${MOCK_CUSTOMER_ID}`;
    let seen: string[] = [];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) seen = JSON.parse(raw) as string[];
    } catch {
      seen = [];
    }
    const fresh = ids.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // ignore storage failures
    }
    const t = setTimeout(() => setCelebrateId(fresh[0]), 250);
    return () => clearTimeout(t);
  }, [isMounted, earnedKey, loyaltyFacilityId]);

  const celebrateBadge = badgeView.earned.find(
    (e) => e.badge.id === celebrateId,
  )?.badge;

  const formatEarnedDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Redeemable dollar value of the points balance at the facility's rate.
  const pointsValue = useMemo(() => {
    if (!loyaltyData) return 0;
    return loyaltyData.points / redemptionRate;
  }, [loyaltyData, redemptionRate]);

  if (!loyaltySettings.enabled) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <Gift className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
              <h2 className="mb-2 text-2xl font-bold">
                Loyalty Program Not Available
              </h2>
              <p className="text-muted-foreground">
                The loyalty program is not currently enabled for this facility.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Loyalty & Rewards</h1>
          <p className="text-muted-foreground mt-1">
            Earn points, unlock rewards, and refer friends to earn more
          </p>
        </div>

        {/* Points Summary Card */}
        {loyaltyData && (
          <Card className="border-primary/20 from-primary/10 via-primary/5 to-background bg-linear-to-br">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Points Balance and Value */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 rounded-full p-4">
                      <Star className="text-primary size-8" />
                    </div>
                    <div>
                      <div className="text-4xl font-bold">
                        {loyaltyData.points.toLocaleString()} Points
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        {pointsValue > 0 && (
                          <>≈ ${pointsValue.toFixed(2)} in credit</>
                        )}
                        {loyaltyData.creditBalance > 0 && (
                          <>
                            {pointsValue > 0 ? " · " : ""}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ${loyaltyData.creditBalance.toFixed(2)} credit
                              available
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={() => setPointsRedeemOpen(true)}>
                      Redeem Points
                    </Button>
                    <p className="text-muted-foreground text-right text-xs">
                      {redemptionRate} points = $1.00 in credit. Minimum
                      redemption: {minimumRedemptionPoints.toLocaleString()}{" "}
                      points.
                    </p>
                  </div>
                </div>

                {/* Tier and Progress */}
                {loyaltyData.currentTier && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className="text-sm font-semibold"
                          style={{
                            backgroundColor:
                              loyaltyData.currentTier.color || undefined,
                            color: loyaltyData.currentTier.color
                              ? "#fff"
                              : undefined,
                          }}
                        >
                          {loyaltyData.currentTier.name} Tier
                        </Badge>
                      </div>
                      {loyaltyData.nextTier && (
                        <div className="text-muted-foreground text-sm font-medium">
                          {loyaltyData.pointsToNextTier.toLocaleString()} points
                          away from {loyaltyData.nextTier.name} Tier
                        </div>
                      )}
                      {!loyaltyData.nextTier && (
                        <div className="text-muted-foreground text-sm font-medium">
                          Highest tier achieved! 🎉
                        </div>
                      )}
                    </div>

                    {loyaltyData.nextTier && (
                      <>
                        <Progress
                          value={loyaltyData.progressPercentage}
                          className="h-3"
                        />
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {loyaltyData.points.toLocaleString()} /{" "}
                            {loyaltyData.nextTier.minPoints.toLocaleString()}{" "}
                            points
                          </span>
                          <span>
                            {Math.round(loyaltyData.progressPercentage)}% to{" "}
                            {loyaltyData.nextTier.name}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Summary Text (Example Format) */}
                {loyaltyData.nextTier && (
                  <div className="border-t pt-2">
                    <p className="text-base font-medium">
                      {loyaltyData.points.toLocaleString()} Points –{" "}
                      {loyaltyData.pointsToNextTier.toLocaleString()} points
                      away from {loyaltyData.nextTier.name} Tier
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stat bar — persistent context directly below the hero (Task 52) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiTile
            label="Current Points"
            value={loyaltyData?.points || 0}
            icon={Star}
            tone="amber"
          />
          <KpiTile
            label="Lifetime Points"
            value={lifetimePoints}
            icon={TrendingUp}
            tone="violet"
          />
          <KpiTile
            label="Total Spent"
            value={`$${totalSpent.toFixed(2)}`}
            icon={DollarSign}
            tone="emerald"
          />
        </div>

        {/* How Points Are Earned */}
        <Card id="how-points-earned" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              How Points Are Earned
            </CardTitle>
            <CardDescription>
              Ways to earn loyalty points at{" "}
              {selectedFacility?.name || "this facility"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnRules.length > 0 ? (
              <div className="space-y-3">
                {earnRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-background/60 flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                      <Star className="text-primary size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {earnRuleCustomerSummary(rule)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Info className="size-4 shrink-0" />
                Earn points on every visit — ask the front desk for details.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Rewards — wallet of active RewardRedemptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Your Rewards
            </CardTitle>
            <CardDescription>
              Rewards you have available to use right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walletRewards.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {walletRewards.map((reward) => {
                  const Icon = WALLET_ICONS[reward.icon];
                  return (
                    <div
                      key={reward.id}
                      className="bg-background/60 flex flex-col gap-3 rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                            <Icon className="text-primary size-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              {reward.title}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-xs">
                              Applies to: {reward.servicesText}
                            </div>
                          </div>
                        </div>
                        {isMounted && reward.isExpiringSoon && (
                          <Badge className="shrink-0 border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
                            Expiring soon
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {reward.valueChip}
                        </Badge>
                        {isMounted && (
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Clock className="size-3" />
                            {reward.expiresInDays != null
                              ? `Expires in ${reward.expiresInDays} ${
                                  reward.expiresInDays === 1 ? "day" : "days"
                                }`
                              : "No expiry"}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setUseRewardTarget(reward)}
                      >
                        <QrCode className="size-4" />
                        Use reward
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center py-8 text-center">
                <Gift className="mb-2 size-10 opacity-50" />
                <p className="text-sm font-medium">No rewards available yet</p>
                <p className="mt-1 text-xs">
                  Keep earning points and watch this space — your rewards will
                  appear here.
                </p>
              </div>
            )}

            {walletRewards.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline">
                  <Link href="/customer/bookings">
                    View my bookings
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Benefits — current (unlocked) + next (locked, to motivate) */}
        {loyaltyData?.currentTier && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-5" />
                Tier Benefits
              </CardTitle>
              <CardDescription>
                What you enjoy now — and what you&apos;re working toward
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Current tier — unlocked */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="font-semibold"
                      style={{
                        backgroundColor: `${loyaltyData.currentTier.color}20`,
                        color: loyaltyData.currentTier.color,
                      }}
                    >
                      {loyaltyData.currentTier.name}
                    </Badge>
                    <span className="text-sm font-medium">
                      Your {loyaltyData.currentTier.name} benefits
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {loyaltyData.currentTier.discountPercentage > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm">
                          {loyaltyData.currentTier.discountPercentage}% discount
                          on all services
                        </span>
                      </li>
                    )}
                    {loyaltyData.currentTier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next tier — locked */}
                {loyaltyData.nextTier ? (
                  <div className="bg-muted/30 space-y-3 rounded-lg border border-dashed p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="text-muted-foreground size-4" />
                        <span className="text-sm font-medium">
                          Unlock at {loyaltyData.nextTier.name}
                        </span>
                      </div>
                      <p className="text-primary mt-1 text-xs font-semibold">
                        {loyaltyData.pointsToNextTier.toLocaleString()} more
                        points to go
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {loyaltyData.nextTier.discountPercentage >
                        loyaltyData.currentTier.discountPercentage && (
                        <li className="text-muted-foreground flex items-start gap-2">
                          <Lock className="mt-0.5 size-4 shrink-0" />
                          <span className="text-sm">
                            {loyaltyData.nextTier.discountPercentage}% discount
                            on all services
                          </span>
                        </li>
                      )}
                      {loyaltyData.nextTier.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="text-muted-foreground flex items-start gap-2"
                        >
                          <Lock className="mt-0.5 size-4 shrink-0" />
                          <span className="text-sm">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                    <Sparkles className="text-primary mb-2 size-6" />
                    <p className="text-sm font-medium">
                      You&apos;re at the top!
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      You&apos;ve unlocked every tier — enjoy your perks.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("how-points-earned")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-primary text-sm font-medium hover:underline"
              >
                How do I earn more points?
              </button>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="points">My History</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          {/* Points History Tab */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My History</CardTitle>
                <CardDescription>
                  Every point you&apos;ve earned, redeemed, or had adjusted —
                  newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoyaltyTransactionHistory
                  transactions={pointTransactions}
                  currentBalance={loyaltyData?.points ?? 0}
                  filterable
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" id="redeem" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="size-5" />
                  Rewards Available
                </CardTitle>
                <CardDescription>
                  Use your points to get discounts and rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loyaltyData ? (
                  <div className="space-y-4">
                    {/* Active Rewards */}
                    {loyaltyRewards
                      .filter(
                        (reward: LoyaltyReward) =>
                          reward.isActive &&
                          (reward.requiredPoints === 0 ||
                            loyaltyData.points >= reward.requiredPoints),
                      )
                      .map((reward: LoyaltyReward) => (
                        <Card key={reward.id} className="border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {reward.name}
                                  </h3>
                                  {reward.requiredPoints === 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Visit-Based
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground mb-2 text-sm">
                                  {reward.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                  {reward.requiredPoints > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Required:{" "}
                                      </span>
                                      <span className="font-semibold">
                                        {reward.requiredPoints.toLocaleString()}{" "}
                                        points
                                      </span>
                                    </div>
                                  )}
                                  {reward.expiryDays && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Expires:{" "}
                                      </span>
                                      <span className="font-semibold">
                                        {reward.expiryDays} days
                                      </span>
                                    </div>
                                  )}
                                  {reward.applicableServices &&
                                    reward.applicableServices.length > 0 && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          Services:{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {reward.applicableServices
                                            .map(
                                              (s: string) =>
                                                s.charAt(0).toUpperCase() +
                                                s.slice(1),
                                            )
                                            .join(", ")}
                                        </span>
                                      </div>
                                    )}
                                </div>
                                {reward.terms && (
                                  <div className="bg-muted text-muted-foreground mt-2 rounded-sm p-2 text-xs">
                                    <Info className="mr-1 inline size-3" />
                                    {reward.terms}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {reward.requiredPoints > 0 && (
                                  <div className="text-right">
                                    <div className="text-primary text-2xl font-bold">
                                      {reward.requiredPoints.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      points
                                    </div>
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  disabled={
                                    reward.requiredPoints > 0 &&
                                    loyaltyData.points < reward.requiredPoints
                                  }
                                  onClick={() => {
                                    setSelectedReward(reward);
                                    setRedeemDialogOpen(true);
                                  }}
                                >
                                  {reward.requiredPoints === 0
                                    ? "View Details"
                                    : "Redeem"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {/* Rewards Not Yet Available */}
                    {loyaltyRewards
                      .filter(
                        (reward: LoyaltyReward) =>
                          reward.isActive &&
                          reward.requiredPoints > 0 &&
                          loyaltyData.points < reward.requiredPoints,
                      )
                      .map((reward: LoyaltyReward) => (
                        <Card
                          key={reward.id}
                          className="border-muted opacity-60"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <h3 className="text-muted-foreground font-semibold">
                                    {reward.name}
                                  </h3>
                                </div>
                                <p className="text-muted-foreground mb-2 text-sm">
                                  {reward.description}
                                </p>
                                <div className="text-muted-foreground text-sm">
                                  Need {reward.requiredPoints.toLocaleString()}{" "}
                                  points • You have{" "}
                                  {loyaltyData.points.toLocaleString()} points
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground text-2xl font-bold">
                                  {reward.requiredPoints.toLocaleString()}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  points
                                </div>
                                <div className="text-muted-foreground mt-2 text-xs">
                                  {reward.requiredPoints - loyaltyData.points}{" "}
                                  more needed
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {loyaltyRewards.filter((r: LoyaltyReward) => r.isActive)
                      .length === 0 && (
                      <div className="text-muted-foreground py-8 text-center">
                        <Gift className="mx-auto mb-2 size-12 opacity-50" />
                        <p>No rewards available at this time</p>
                        <p className="mt-1 text-xs">
                          Check back later for new rewards!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Gift className="mx-auto mb-2 size-12 opacity-50" />
                    <p>No loyalty data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Refer Friends
                </CardTitle>
                <CardDescription>
                  Share your referral code and earn rewards when friends sign up
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerReferralCodes.length > 0 ? (
                  customerReferralCodes.map((refCode) => (
                    <Card key={refCode.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-[200px] flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <Label className="text-sm font-medium">
                                Your Referral Code
                              </Label>
                              <Badge variant="outline" className="font-mono">
                                {refCode.code}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground space-y-1 text-sm">
                              <div>
                                You earn:{" "}
                                <span className="font-semibold">
                                  ${refCode.referrerReward}
                                </span>{" "}
                                per referral
                              </div>
                              <div>
                                Friend gets:{" "}
                                <span className="font-semibold">
                                  ${refCode.refereeReward}
                                </span>{" "}
                                off their first booking
                              </div>
                              <div>
                                Used:{" "}
                                <span className="font-semibold">
                                  {refCode.timesUsed}
                                </span>
                                {refCode.maxUses && ` / ${refCode.maxUses}`}{" "}
                                times
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(refCode.code, refCode.id)
                              }
                            >
                              {copiedCode === refCode.id ? (
                                <>
                                  <CheckCircle2 className="mr-2 size-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 size-4" />
                                  Copy Code
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const shareText = `Join me at ${selectedFacility?.name || "this facility"}! Use my referral code ${refCode.code} for $${refCode.refereeReward} off your first booking!`;
                                if (navigator.share) {
                                  navigator.share({
                                    title: "Referral Code",
                                    text: shareText,
                                  });
                                } else {
                                  copyToClipboard(shareText, refCode.id);
                                }
                              }}
                            >
                              <ExternalLink className="mr-2 size-4" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Users className="mx-auto mb-2 size-12 opacity-50" />
                    <p>No referral codes available</p>
                    <p className="mt-1 text-xs">
                      Contact the facility to get your referral code
                    </p>
                  </div>
                )}

                {/* How Referrals Work */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="mb-2 text-sm font-medium">
                      How Referrals Work:
                    </div>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
                      <li>Share your unique referral code with friends</li>
                      <li>
                        When they sign up and make their first booking using
                        your code, they get a discount
                      </li>
                      <li>
                        You earn a reward credit for each successful referral
                      </li>
                      <li>Rewards are automatically added to your account</li>
                    </ol>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            {/* Earned badges — full colour, with earned date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5" />
                  Earned badges
                </CardTitle>
                <CardDescription>
                  Achievements you&apos;ve unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                {badgeView.earned.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {badgeView.earned.map(({ badge, earnedAt }) => (
                      <Card
                        key={badge.id}
                        className="border-primary/30 bg-primary/5"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{badge.icon}</div>
                            <div className="flex-1">
                              <div className="mb-1 font-semibold">
                                {badge.name}
                              </div>
                              <div className="text-muted-foreground mb-2 text-sm">
                                {badgeConditionText(badge)}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {badge.reward && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Reward: {badgeRewardText(badge.reward)}
                                  </Badge>
                                )}
                                {isMounted && earnedAt && (
                                  <span className="text-muted-foreground text-xs">
                                    Earned {formatEarnedDate(earnedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Award className="mx-auto mb-2 size-12 opacity-50" />
                    <p>No badges earned yet</p>
                    <p className="mt-1 text-xs">
                      Keep booking and referring to unlock badges!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* In progress — locked, grayed, with progress bars */}
            {badgeView.inProgress.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="size-5" />
                    In progress
                  </CardTitle>
                  <CardDescription>
                    Badges you&apos;re working toward
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {badgeView.inProgress.map(({ badge, progress }) => (
                      <Card key={badge.id} className="bg-muted/30">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl opacity-40 grayscale">
                              {badge.icon}
                            </div>
                            <div className="flex-1">
                              <div className="mb-1 font-semibold">
                                {badge.name}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {badgeConditionText(badge)}
                              </div>
                              {badge.reward && (
                                <Badge
                                  variant="outline"
                                  className="mt-2 text-xs"
                                >
                                  Reward: {badgeRewardText(badge.reward)}
                                </Badge>
                              )}
                            </div>
                            <Lock className="text-muted-foreground size-4 shrink-0" />
                          </div>
                          {progress.measurable && (
                            <div className="space-y-1">
                              <Progress value={progress.ratio * 100} />
                              <div className="text-muted-foreground text-xs">
                                {progress.label}
                              </div>
                            </div>
                          )}
                          {!progress.measurable && (
                            <div className="text-muted-foreground text-xs">
                              {progress.label}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {celebrateBadge && (
          <BadgeCelebration
            icon={celebrateBadge.icon}
            name={celebrateBadge.name}
            onDone={() => setCelebrateId(null)}
          />
        )}

        {/* Redemption Confirmation Dialog */}
        <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redeem Reward</DialogTitle>
              <DialogDescription>
                Confirm your reward redemption
              </DialogDescription>
            </DialogHeader>
            {selectedReward && loyaltyData && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="mb-2 font-semibold">
                    {selectedReward.name}
                  </div>
                  <div className="text-muted-foreground mb-3 text-sm">
                    {selectedReward.description}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Points Required:
                    </span>
                    <span className="font-semibold">
                      {selectedReward.requiredPoints.toLocaleString()} points
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Points:</span>
                    <span className="font-semibold">
                      {loyaltyData.points.toLocaleString()} points
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                    <span>Points After Redemption:</span>
                    <span className="text-primary">
                      {(
                        loyaltyData.points - selectedReward.requiredPoints
                      ).toLocaleString()}{" "}
                      points
                    </span>
                  </div>
                </div>

                {selectedReward.terms && (
                  <div className="border-warning/20 bg-warning/10 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Info className="text-warning mt-0.5 size-4 shrink-0" />
                      <div className="text-warning-foreground text-xs">
                        <div className="mb-1 font-medium">
                          Terms & Conditions:
                        </div>
                        {selectedReward.terms}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="mb-1 text-sm font-medium">
                    What happens next:
                  </div>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    {selectedReward.rewardType === "discount_code" && (
                      <p>
                        • A discount code will be generated and added to your
                        account
                      </p>
                    )}
                    {selectedReward.rewardType === "credit_balance" && (
                      <p>
                        • ${selectedReward.rewardValue} will be added to your
                        account credit balance
                      </p>
                    )}
                    {selectedReward.rewardType === "auto_apply" && (
                      <p>
                        • This reward will automatically apply to your next
                        eligible booking
                      </p>
                    )}
                    {selectedReward.rewardType === "free_service" && (
                      <p>
                        • A free service voucher will be added to your account
                      </p>
                    )}
                    <p>• Points will be deducted from your account</p>
                    <p>• Transaction will be logged in your points history</p>
                    {selectedReward.expiryDays && (
                      <p>
                        • Reward expires in {selectedReward.expiryDays} days
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRedeemDialogOpen(false);
                  setSelectedReward(null);
                }}
                disabled={isRedeeming}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedReward || !loyaltyData) return;

                  setIsRedeeming(true);
                  try {
                    // TODO: Replace with actual API call
                    await new Promise((resolve) => setTimeout(resolve, 1500));

                    // Generate reward based on type
                    let rewardDetails = "";
                    if (selectedReward.rewardType === "discount_code") {
                      const code = `LOYALTY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                      rewardDetails = `Discount code: ${code}`;
                      toast.success(`Reward redeemed! ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "credit_balance") {
                      rewardDetails = `$${selectedReward.rewardValue} credit added to your account`;
                      toast.success(`Reward redeemed! ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "auto_apply") {
                      rewardDetails =
                        "Reward will be automatically applied to your next booking";
                      toast.success(`Reward redeemed! ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "free_service") {
                      rewardDetails = `Free ${selectedReward.rewardValue} service voucher added`;
                      toast.success(`Reward redeemed! ${rewardDetails}`);
                    }

                    // TODO: In production, this would:
                    // 1. Deduct points from customer account
                    // 2. Create discount code / add credit / create voucher
                    // 3. Link reward to customer account
                    // 4. Log transaction in loyalty history
                    // 5. Update invoice/booking system if auto-apply

                    setRedeemDialogOpen(false);
                    setSelectedReward(null);
                  } catch (error: unknown) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to redeem reward",
                    );
                  } finally {
                    setIsRedeeming(false);
                  }
                }}
                disabled={
                  isRedeeming ||
                  !selectedReward ||
                  !loyaltyData ||
                  loyaltyData.points < selectedReward.requiredPoints
                }
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  "Confirm Redemption"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedFacility && (
          <RedeemPointsDialog
            open={pointsRedeemOpen}
            onOpenChange={setPointsRedeemOpen}
            facilityId={selectedFacility.id}
            customerId={MOCK_CUSTOMER_ID}
            redemptionRate={redemptionRate}
          />
        )}

        {/* Use reward — show the code/QR to present at the facility (Task 46) */}
        <Dialog
          open={useRewardTarget !== null}
          onOpenChange={(v) => !v && setUseRewardTarget(null)}
        >
          <DialogContent className="max-w-sm">
            {useRewardTarget &&
              (() => {
                const code = `RWD-${useRewardTarget.id
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .slice(-8)
                  .toUpperCase()
                  .padStart(8, "0")}`;
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>{useRewardTarget.title}</DialogTitle>
                      <DialogDescription>
                        Show this code at {selectedFacility?.name || "the front desk"}{" "}
                        to redeem your reward.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div className="rounded-xl border bg-white p-4">
                        <QrCode className="size-32 text-slate-900" />
                      </div>
                      <div className="w-full text-center">
                        <p className="text-muted-foreground text-xs">
                          Reward code
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(code, useRewardTarget.id)}
                          className="mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-lg font-semibold tracking-wider hover:bg-muted"
                        >
                          {code}
                          {copiedCode === useRewardTarget.id ? (
                            <CheckCircle2 className="size-4 text-green-600" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {useRewardTarget.valueChip} · {useRewardTarget.servicesText}
                      </Badge>
                    </div>
                    <DialogFooter>
                      <Button
                        className="w-full"
                        onClick={() => setUseRewardTarget(null)}
                      >
                        Done
                      </Button>
                    </DialogFooter>
                  </>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
