"use client";

import { useMemo, useState, useEffect } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
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
  referralCodes,
  loyaltyRewards,
  type LoyaltyReward,
} from "@/data/marketing";
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
import { useQuery } from "@tanstack/react-query";
import { customerLoyaltyQueries } from "@/lib/api/loyalty-ledger";
import { RedeemPointsDialog } from "@/components/customer/RedeemPointsDialog";
import { LoyaltyTransactionHistory } from "@/components/loyalty/LoyaltyTransactionHistory";
import { BadgeCelebration } from "@/components/customer/BadgeCelebration";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatList,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { rich } from "@/lib/i18n/rich";

// Captured once at module load for deterministic expiry math (gated behind
// isMounted at render time to avoid SSR hydration mismatch).
const NOW_MS = Date.now();

const WALLET_ICONS: Record<WalletIcon, LucideIcon> = {
  credit: DollarSign,
  discount: Percent,
  gift_card: CreditCard,
  freebie: Gift,
};

/**
 * What a tier threshold is counted in.
 *
 * The progress copy used to say "points" for every tier, because the fixture
 * ladder only had points. A real tier can be measured on spend or visits, and
 * telling somebody they are "200 points away" from a tier that wants twenty
 * visits is worse than saying nothing.
 */
/** The catalogue key for what a tier threshold counts. */
function unitKeyFor(thresholdType: "points" | "spend" | "visits"): string {
  switch (thresholdType) {
    case "spend":
      return "unitDollarsSpent";
    case "visits":
      return "unitVisits";
    default:
      return "unitPoints";
  }
}

export default function CustomerRewardsPage() {
  const { t, fill, locale } = useCustomerText("rewards");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

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

  // ── FROM POSTGRES ──────────────────────────────────────────────────────
  //
  // One request for the whole wallet: balance, tier, history, the rewards they
  // hold, and the programme itself. It reads through the customer's CLIENT ROW,
  // not through a membership they do not have — `/api/loyalty/accounts` falls
  // back to the demo facility for a caller with no membership, which would have
  // shown a pet owner a balance from a business they have never been to.
  //
  // Four of these used to be separate fixture queries keyed by a numeric
  // facility id, so a customer read points, rewards and earn rules that no
  // facility had ever configured.
  const loyaltyFacilityId = selectedFacility?.id ?? 0;
  const { data: wallet, isPending: walletPending } = useQuery(
    customerLoyaltyQueries.mine(),
  );

  const loyaltyAccount = wallet?.account ?? null;
  const redemptionRate = wallet?.redemptionRate ?? 100;
  const minimumRedemptionPoints = wallet?.minimumRedemptionPoints ?? 100;

  // How points are earned HERE. The list a customer reads is now the list the
  // server awards by; it used to fall back to `buildDefaultEarnRules`, which
  // described a programme nobody was running.
  const earnRules = useMemo(
    () => activeCustomerEarnRules(wallet?.earnRules ?? []),
    [wallet],
  );

  // The rewards they hold and can still spend. Expiry is decided by the
  // DATABASE clock in the route, not by this device.
  const activeRewards = useMemo(() => wallet?.rewards ?? [], [wallet]);
  const walletRewards = useMemo(
    () => buildRewardsWallet(activeRewards, NOW_MS, locale),
    [activeRewards, locale],
  );

  // The real ledger, newest first.
  const pointTransactions = useMemo(() => wallet?.transactions ?? [], [wallet]);

  // Lifetime points comes from the ACCOUNT, not from summing the page's copy of
  // the history. The ledger is capped at the most recent hundred entries for
  // display, and adding those up would quietly under-report a long-standing
  // customer — the account's own total is maintained from every entry there has
  // ever been.
  const lifetimePoints = loyaltyAccount?.lifetimePointsEarned ?? 0;

  // ── THE LADDER, AS THIS FACILITY DEFINES IT ────────────────────────────
  //
  // Built from the facility's own tiers. It used to read `loyaltySettings.tiers`
  // — one global fixture — so every customer on the platform was shown the same
  // ladder regardless of what their facility had configured, and the whole
  // screen was gated behind a `customerLoyaltyData` row that a real customer
  // would never have.
  //
  // A threshold is measured on its OWN dimension: points, spend, or visits. The
  // old arithmetic assumed points for every tier, which would have told a
  // customer they were "200 points away" from a tier that actually wanted
  // twenty visits.
  const loyaltyData = useMemo(() => {
    if (!wallet?.enabled) return null;

    const points = loyaltyAccount?.pointsBalance ?? 0;
    const creditBalance = loyaltyAccount?.creditBalance ?? 0;
    const tiers = wallet.tiers;

    const reached = (tier: (typeof tiers)[number]): number => {
      switch (tier.thresholdType) {
        case "spend":
          return loyaltyAccount?.totalSpend ?? 0;
        case "visits":
          return loyaltyAccount?.totalVisits ?? 0;
        default:
          return loyaltyAccount?.lifetimePointsEarned ?? 0;
      }
    };

    const currentTier =
      tiers.find((tier) => tier.id === loyaltyAccount?.currentTierId) ?? null;
    // The first tier they do not yet meet. Tiers arrive lowest-first.
    const nextTier =
      tiers.find((tier) => reached(tier) < tier.thresholdValue) ?? null;

    const have = nextTier ? reached(nextTier) : 0;
    const need = nextTier?.thresholdValue ?? 0;
    const floor =
      currentTier &&
      nextTier &&
      currentTier.thresholdType === nextTier.thresholdType
        ? currentTier.thresholdValue
        : 0;
    const span = need - floor;
    const progressPercentage = span > 0 ? ((have - floor) / span) * 100 : 0;

    return {
      points,
      creditBalance,
      currentTier,
      nextTier,
      /** How much more, on the NEXT tier's own dimension. */
      toNextTier: nextTier ? Math.max(0, need - have) : 0,
      /** What they have on that dimension, for the "x / y" line. */
      towardNextTier: have,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    };
  }, [wallet, loyaltyAccount]);

  // Get referral codes for this customer
  const customerReferralCodes = useMemo(() => {
    return referralCodes.filter((ref) => ref.referrerId === customerId);
  }, [customerId]);

  // What they have PAID this facility, derived from bookings by
  // `loyalty_account_overview`. It summed `src/data/payments` until 2026-08-22
  // and read $0.00 for every real customer — sitting one card above a badge
  // saying "$14,108.75 of $100,000 spent", from the same account, on the same
  // screen.
  const totalSpent = loyaltyAccount?.totalSpend ?? 0;

  // ── BADGES, FROM THE SERVER THAT AWARDS THEM ──────────────────────────
  //
  // Each badge arrives with this customer's own standing already worked out —
  // the condition phrased, the reward phrased, `earnedAt` when they hold it,
  // and progress measured on the criterion's own dimension. Evaluated in the
  // route against exactly the facts `settleBadges` awards from, so the gallery
  // cannot congratulate somebody on a condition the server would decline.
  //
  // EARNED means there is an award row, and nothing else. A badge whose
  // condition is met but which has not been awarded yet sits in the second
  // list at full progress and says so — the award happens on their next visit,
  // and calling it earned before the reward exists would be a promise the
  // account cannot yet honour.
  //
  // Until 2026-08-22 this read eleven hand-authored rows for `facilityId: 1`
  // and re-derived "earned" in the browser, so a customer saw somebody else's
  // badges and could be told they had earned one nothing would ever give them.
  const badgeView = useMemo(() => {
    const all = wallet?.badges ?? [];
    const earned = all
      .filter((b) => b.earnedAt !== null)
      .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
    const inProgress = all
      .filter((b) => b.earnedAt === null)
      .sort((a, b) => b.progress.ratio - a.progress.ratio);
    return { earned, inProgress };
  }, [wallet]);

  // Celebrate badges earned since the customer last visited (tracked in
  // localStorage). The celebration is shown by id; the badge is looked up at
  // render so the effect only manages a string + persistence.
  const earnedKey = useMemo(
    () => badgeView.earned.map((b) => b.id).join(","),
    [badgeView],
  );
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  useEffect(() => {
    if (!isMounted) return;
    const ids = earnedKey ? earnedKey.split(",") : [];
    if (ids.length === 0) return;
    const key = `seen-badges-${loyaltyFacilityId}-${customerId}`;
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
    const timer = setTimeout(() => setCelebrateId(fresh[0]), 250);
    return () => clearTimeout(timer);
  }, [isMounted, earnedKey, loyaltyFacilityId]);

  const celebrateBadge = badgeView.earned.find((b) => b.id === celebrateId);

  const formatEarnedDate = (iso: string) => formatDateLong(iso, locale);

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    toast.success(t("referralCodeCopied"));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Redeemable dollar value of the points balance at the facility's rate.
  const pointsValue = useMemo(() => {
    if (!loyaltyData) return 0;
    return loyaltyData.points / redemptionRate;
  }, [loyaltyData, redemptionRate]);

  // ── IS THERE A PROGRAMME AT ALL ────────────────────────────────────────
  //
  // The customer's OWN facility, not `loyaltySettings.enabled` — one global
  // fixture that read `true` for everybody. A facility running no loyalty
  // programme still showed its customers this whole screen.
  //
  // Behind `walletPending`, because the answer is not known until the request
  // resolves and "not available" is the wrong thing to flash at somebody who
  // has a programme. Same shape as the settings latch: an unanswered question
  // is not a "no".
  if (walletPending) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="bg-muted/40 h-32 animate-pulse rounded-xl" />
          <div className="bg-muted/40 h-64 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!wallet?.enabled) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <Gift className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
              <h2 className="mb-2 text-2xl font-bold">
                {t("loyaltyProgramNotAvailable")}
              </h2>
              <p className="text-muted-foreground">
                {t("theLoyaltyProgramIsNot")}
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
        {/* The facility's OWN name for its programme when it has given one.
            A customer reads what their business calls it, not a platform
            label — the name has been configurable since the programme moved
            into `facility_settings` and nothing had shown it. It is also a
            string §5r keeps out of the locale layer: a business named its
            programme, and that name is not translated. */}
        <PageHeader
          title={wallet?.programName ?? t("loyaltyRewards")}
          description={t("earnPointsUnlockRewardsAnd")}
        />

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
                        {fill("pointsCount", {
                          n: formatNumber(loyaltyData.points, locale),
                        })}
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        {pointsValue > 0 && (
                          <>
                            {fill("approxInCredit", {
                              amount: formatMoney(pointsValue, locale),
                            })}
                          </>
                        )}
                        {loyaltyData.creditBalance > 0 && (
                          <>
                            {pointsValue > 0 ? " · " : ""}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {fill("creditAvailable", {
                                amount: formatMoney(
                                  loyaltyData.creditBalance,
                                  locale,
                                ),
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={() => setPointsRedeemOpen(true)}>
                      {t("redeemPoints")}
                    </Button>
                    <p className="text-muted-foreground text-right text-xs">
                      {fill("redemptionRateLine", {
                        rate: formatNumber(redemptionRate, locale),
                        dollar: formatMoney(1, locale),
                        min: formatNumber(minimumRedemptionPoints, locale),
                      })}
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
                          {fill("tierNamed", {
                            tier: loyaltyData.currentTier.name,
                          })}
                        </Badge>
                      </div>
                      {loyaltyData.nextTier && (
                        <div className="text-muted-foreground text-sm font-medium">
                          {fill("awayFromTier", {
                            n: formatNumber(loyaltyData.toNextTier, locale),
                            unit: t(
                              unitKeyFor(loyaltyData.nextTier.thresholdType),
                            ),
                            tier: loyaltyData.nextTier.name,
                          })}
                        </div>
                      )}
                      {!loyaltyData.nextTier && (
                        <div className="text-muted-foreground text-sm font-medium">
                          {t("highestTierAchieved")}
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
                            {formatNumber(loyaltyData.towardNextTier, locale)} /{" "}
                            {formatNumber(
                              loyaltyData.nextTier.thresholdValue,
                              locale,
                            )}{" "}
                            {t(unitKeyFor(loyaltyData.nextTier.thresholdType))}
                          </span>
                          <span>
                            {fill("percentToTier", {
                              percent: formatPercent(
                                Math.round(loyaltyData.progressPercentage),
                                locale,
                              ),
                              tier: loyaltyData.nextTier.name,
                            })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stat bar — persistent context directly below the hero (Task 52) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiTile
            label={t("currentPoints")}
            value={loyaltyData?.points || 0}
            icon={Star}
            tone="amber"
          />
          <KpiTile
            label={t("lifetimePoints")}
            value={lifetimePoints}
            icon={TrendingUp}
            tone="violet"
          />
          <KpiTile
            label={t("totalSpent")}
            value={formatMoney(totalSpent, locale)}
            icon={DollarSign}
            tone="emerald"
          />
        </div>

        {/* How Points Are Earned */}
        <Card id="how-points-earned" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              {t("howPointsAreEarned")}
            </CardTitle>
            <CardDescription>
              {fill("waysToEarnAt", {
                facility: selectedFacility?.name || t("thisFacility"),
              })}
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
                        {earnRuleCustomerSummary(rule, locale)}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("active")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Info className="size-4 shrink-0" />
                {t("earnPointsOnEveryVisit")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Rewards — wallet of active RewardRedemptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              {t("yourRewards")}
            </CardTitle>
            <CardDescription>{t("rewardsYouHaveAvailableTo")}</CardDescription>
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
                              {fill("appliesTo", {
                                services: reward.servicesText,
                              })}
                            </div>
                          </div>
                        </div>
                        {isMounted && reward.isExpiringSoon && (
                          <Badge className="shrink-0 border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
                            {t("expiringSoon")}
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
                              ? fill(
                                  reward.expiresInDays === 1
                                    ? "expiresInDaysOne"
                                    : "expiresInDaysOther",
                                  { n: reward.expiresInDays },
                                )
                              : t("noExpiry")}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setUseRewardTarget(reward)}
                      >
                        <QrCode className="size-4" />
                        {t("useReward")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center py-8 text-center">
                <Gift className="mb-2 size-10 opacity-50" />
                <p className="text-sm font-medium">
                  {t("noRewardsAvailableYet")}
                </p>
                <p className="mt-1 text-xs">{t("keepEarningPoints")}</p>
              </div>
            )}

            {walletRewards.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline">
                  <Link href="/customer/bookings">
                    {t("viewMyBookings")}
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
                {t("tierBenefits")}
              </CardTitle>
              <CardDescription>{t("whatYouEnjoyNowAnd")}</CardDescription>
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
                      {fill("yourTierBenefits", {
                        tier: loyaltyData.currentTier.name,
                      })}
                    </span>
                  </div>
                  <ul className="space-y-2">
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
                          {fill("unlockAtTier", {
                            tier: loyaltyData.nextTier.name,
                          })}
                        </span>
                      </div>
                      <p className="text-primary mt-1 text-xs font-semibold">
                        {fill("moreToGo", {
                          n: formatNumber(loyaltyData.toNextTier, locale),
                          unit: t(
                            unitKeyFor(loyaltyData.nextTier.thresholdType),
                          ),
                        })}
                      </p>
                    </div>
                    <ul className="space-y-2">
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
                    <p className="text-sm font-medium">{t("youreAtTheTop")}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("youveUnlockedEveryTierEnjoy")}
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
                {t("howDoIEarnMore")}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="points">{t("myHistory")}</TabsTrigger>
            <TabsTrigger value="rewards">{t("rewards")}</TabsTrigger>
            <TabsTrigger value="referrals">{t("referrals")}</TabsTrigger>
            <TabsTrigger value="badges">{t("badges")}</TabsTrigger>
          </TabsList>

          {/* Points History Tab */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("myHistory")}</CardTitle>
                <CardDescription>{t("everyPointNewestFirst")}</CardDescription>
              </CardHeader>
              <CardContent>
                <LoyaltyTransactionHistory
                  transactions={pointTransactions}
                  currentBalance={loyaltyData?.points ?? 0}
                  filterable
                  showTime
                  emptyText="No transactions yet. Points you earn and redeem will appear here."
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
                  {t("rewardsAvailable")}
                </CardTitle>
                <CardDescription>{t("useYourPointsToGet")}</CardDescription>
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
                                      {t("visitBased")}
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
                                        {t("requiredLabel")}{" "}
                                      </span>
                                      <span className="font-semibold">
                                        {formatNumber(
                                          reward.requiredPoints,
                                          locale,
                                        )}{" "}
                                        {t("points2")}
                                      </span>
                                    </div>
                                  )}
                                  {reward.expiryDays && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        {t("expiresLabel")}{" "}
                                      </span>
                                      <span className="font-semibold">
                                        {fill("daysCount", {
                                          n: reward.expiryDays,
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {reward.applicableServices &&
                                    reward.applicableServices.length > 0 && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          {t("servicesLabel")}{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {formatList(
                                            reward.applicableServices.map(
                                              (s: string) =>
                                                serviceTypeLabel(locale, s),
                                            ),
                                            locale,
                                          )}
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
                                      {formatNumber(
                                        reward.requiredPoints,
                                        locale,
                                      )}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {t("points2")}
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
                                    ? t("viewDetails")
                                    : t("redeem")}
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
                                  {fill("needPointsYouHave", {
                                    need: formatNumber(
                                      reward.requiredPoints,
                                      locale,
                                    ),
                                    have: formatNumber(
                                      loyaltyData.points,
                                      locale,
                                    ),
                                  })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground text-2xl font-bold">
                                  {formatNumber(reward.requiredPoints, locale)}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {t("points2")}
                                </div>
                                <div className="text-muted-foreground mt-2 text-xs">
                                  {formatNumber(
                                    reward.requiredPoints - loyaltyData.points,
                                    locale,
                                  )}{" "}
                                  {t("moreNeeded")}
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
                        <p>{t("noRewardsAvailable")}</p>
                        <p className="mt-1 text-xs">
                          {t("keepEarningPointsToUnlock")}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Gift className="mx-auto mb-2 size-12 opacity-50" />
                    <p>{t("noLoyaltyDataAvailable")}</p>
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
                  {t("referFriends")}
                </CardTitle>
                <CardDescription>
                  {t("shareYourReferralCodeAnd")}
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
                                {t("yourReferralCode")}
                              </Label>
                              <Badge variant="outline" className="font-mono">
                                {refCode.code}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground space-y-1 text-sm">
                              <div>
                                {rich(t("youEarnPerReferral"), {
                                  amount: (
                                    <span className="font-semibold">
                                      {formatMoney(
                                        refCode.referrerReward,
                                        locale,
                                      )}
                                    </span>
                                  ),
                                })}
                              </div>
                              <div>
                                {rich(t("friendGetsOff"), {
                                  amount: (
                                    <span className="font-semibold">
                                      {formatMoney(
                                        refCode.refereeReward,
                                        locale,
                                      )}
                                    </span>
                                  ),
                                })}
                              </div>
                              <div>
                                {rich(t("usedTimes"), {
                                  n: (
                                    <span className="font-semibold">
                                      {refCode.timesUsed}
                                      {refCode.maxUses &&
                                        ` / ${refCode.maxUses}`}
                                    </span>
                                  ),
                                })}
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
                                  {t("copied")}
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 size-4" />
                                  {t("copyCode")}
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const shareText = fill("referralShareText", {
                                  facility:
                                    selectedFacility?.name || t("thisFacility"),
                                  code: refCode.code,
                                  amount: formatMoney(
                                    refCode.refereeReward,
                                    locale,
                                  ),
                                });
                                if (navigator.share) {
                                  navigator.share({
                                    title: t("referralCode"),
                                    text: shareText,
                                  });
                                } else {
                                  copyToClipboard(shareText, refCode.id);
                                }
                              }}
                            >
                              <ExternalLink className="mr-2 size-4" />
                              {t("share")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Users className="mx-auto mb-2 size-12 opacity-50" />
                    <p className="mx-auto max-w-sm text-sm">
                      {t("shareReferralLink")}
                    </p>
                  </div>
                )}

                {/* How Referrals Work */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="mb-2 text-sm font-medium">
                      {t("howReferralsWork")}
                    </div>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
                      <li>{t("shareYourUniqueReferralCode")}</li>
                      <li>{t("whenTheySignUp")}</li>
                      <li>{t("youEarnARewardCredit")}</li>
                      <li>{t("rewardsAreAutomaticallyAddedTo")}</li>
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
                  {t("earnedBadges")}
                </CardTitle>
                <CardDescription>
                  {t("achievementsYouveUnlocked")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {badgeView.earned.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {badgeView.earned.map((badge) => (
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
                                {badge.conditionText}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {badge.rewardText && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {fill("rewardIs", {
                                      reward: badge.rewardText,
                                    })}
                                  </Badge>
                                )}
                                {isMounted && badge.earnedAt && (
                                  <span className="text-muted-foreground text-xs">
                                    {fill("earnedOn", {
                                      date: formatEarnedDate(badge.earnedAt),
                                    })}
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
                    <p>{t("noBadgesEarnedYet")}</p>
                    <p className="mt-1 text-xs">
                      {t("keepBookingAndReferringTo")}
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
                    {t("inProgress")}
                  </CardTitle>
                  <CardDescription>
                    {t("badgesYoureWorkingToward")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {badgeView.inProgress.map((badge) => (
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
                                {badge.conditionText}
                              </div>
                              {badge.rewardText && (
                                <Badge
                                  variant="outline"
                                  className="mt-2 text-xs"
                                >
                                  {fill("rewardIs", {
                                    reward: badge.rewardText,
                                  })}
                                </Badge>
                              )}
                            </div>
                            <Lock className="text-muted-foreground size-4 shrink-0" />
                          </div>
                          {badge.progress.measurable && (
                            <div className="space-y-1">
                              <Progress value={badge.progress.ratio * 100} />
                              <div className="text-muted-foreground text-xs">
                                {badge.progress.label}
                              </div>
                            </div>
                          )}
                          {!badge.progress.measurable && (
                            <div className="text-muted-foreground text-xs">
                              {badge.progress.label}
                            </div>
                          )}
                          {/* Met, but not yet awarded. The server awards on a
                              transaction, so saying "earned" here would promise
                              a reward the account does not hold yet. */}
                          {badge.progress.met && (
                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {t("unlockedYoursAtYourNext")}
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
              <DialogTitle>{t("redeemReward")}</DialogTitle>
              <DialogDescription>
                {t("confirmYourRewardRedemption")}
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
                      {t("pointsRequired")}
                    </span>
                    <span className="font-semibold">
                      {fill("pointsCountLower", {
                        n: formatNumber(selectedReward.requiredPoints, locale),
                      })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("yourPoints")}
                    </span>
                    <span className="font-semibold">
                      {fill("pointsCountLower", {
                        n: formatNumber(loyaltyData.points, locale),
                      })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                    <span>{t("pointsAfterRedemption")}</span>
                    <span className="text-primary">
                      {formatNumber(
                        loyaltyData.points - selectedReward.requiredPoints,
                        locale,
                      )}{" "}
                      {t("points2")}
                    </span>
                  </div>
                </div>

                {selectedReward.terms && (
                  <div className="border-warning/20 bg-warning/10 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Info className="text-warning mt-0.5 size-4 shrink-0" />
                      <div className="text-warning-foreground text-xs">
                        <div className="mb-1 font-medium">
                          {t("termsConditions")}
                        </div>
                        {selectedReward.terms}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="mb-1 text-sm font-medium">
                    {t("whatHappensNext")}
                  </div>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    {selectedReward.rewardType === "discount_code" && (
                      <p>{t("nextDiscountCode")}</p>
                    )}
                    {selectedReward.rewardType === "credit_balance" && (
                      <p>
                        {fill("nextCreditAdded", {
                          amount: formatMoney(
                            Number(selectedReward.rewardValue),
                            locale,
                          ),
                        })}
                      </p>
                    )}
                    {selectedReward.rewardType === "auto_apply" && (
                      <p>{t("nextAutoApply")}</p>
                    )}
                    {selectedReward.rewardType === "free_service" && (
                      <p>{t("aFreeServiceVoucherWill")}</p>
                    )}
                    <p>{t("pointsWillBeDeductedFrom")}</p>
                    <p>{t("transactionWillBeLoggedIn")}</p>
                    {selectedReward.expiryDays && (
                      <p>
                        {fill("nextRewardExpires", {
                          n: selectedReward.expiryDays,
                        })}
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
                {t("cancel")}
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
                      rewardDetails = fill("discountCodeIs", { code });
                      toast.success(`${t("rewardRedeemed")} ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "credit_balance") {
                      rewardDetails = fill("creditAddedToAccount", {
                        amount: formatMoney(
                          Number(selectedReward.rewardValue),
                          locale,
                        ),
                      });
                      toast.success(`${t("rewardRedeemed")} ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "auto_apply") {
                      rewardDetails = t("rewardAutoApplied");
                      toast.success(`${t("rewardRedeemed")} ${rewardDetails}`);
                    } else if (selectedReward.rewardType === "free_service") {
                      rewardDetails = fill("freeServiceVoucherAdded", {
                        service: String(selectedReward.rewardValue),
                      });
                      toast.success(`${t("rewardRedeemed")} ${rewardDetails}`);
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
                        : t("redeemFailed"),
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
                    {t("redeeming")}
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
            customerId={customerId ?? 0}
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
                        {fill("showCodeAt", {
                          place: selectedFacility?.name || t("theFrontDesk"),
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div className="rounded-xl border bg-white p-4">
                        <QrCode className="size-32 text-slate-900" />
                      </div>
                      <div className="w-full text-center">
                        <p className="text-muted-foreground text-xs">
                          {t("rewardCode")}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(code, useRewardTarget.id)
                          }
                          className="hover:bg-muted mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-lg font-semibold tracking-wider"
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
                        {useRewardTarget.valueChip} ·{" "}
                        {useRewardTarget.servicesText}
                      </Badge>
                    </div>
                    <DialogFooter>
                      <Button
                        className="w-full"
                        onClick={() => setUseRewardTarget(null)}
                      >
                        {t("done")}
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
