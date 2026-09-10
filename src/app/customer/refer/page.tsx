"use client";

import Image from "next/image";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Copy,
  CheckCircle2,
  MessageCircle,
  QrCode,
  Gift,
  TrendingUp,
  UserPlus,
  Info,
  Mail,
  MessageSquare,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";
import { clients, getClientById } from "@/data/clients";
import { getLoyaltyAccount } from "@/data/loyalty-accounts";
import {
  getReferralRelationshipsByReferrer,
  getReferralStats,
} from "@/data/referral-tracking";
import {
  isReferralProgramEnabled,
  referralRewardText,
  referralRewardFullText,
  renderReferralTemplate,
} from "@/lib/loyalty/referral-program";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateShort, formatMoney } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
// QR Code will be generated using an external service or canvas

type ReferralPillStatus = "pending" | "booked" | "reward_issued";

// When the reward arrives, in the CUSTOMER's words. The facility's wizard has
// its own hints ("Reward fires when…"), which are written for staff.
const WHEN_KEY: Record<string, string> = {
  on_signup: "whenOnSignup",
  on_first_booking: "whenFirstBooking",
  on_first_paid_booking: "whenFirstPaidBooking",
};

interface ReferralTracking {
  id: number;
  friendName: string;
  /** False when the friend could not be identified — "Someone". */
  friendKnown: boolean;
  /** Consolidated status shown to the customer. */
  pillStatus: ReferralPillStatus;
  /** True once the referrer's reward has been issued. */
  rewardEarned: boolean;
  referredOn?: string;
}

export default function CustomerReferPage() {
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();
  const { t, fill, locale } = useCustomerText("refer");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [dismissedRewardNotifications, setDismissedRewardNotifications] =
    useState<Set<number>>(new Set());

  // Get facility loyalty config — scoped to the customer's SESSION facility
  // (not a hardcoded id), so the referral gate reflects the right facility.
  const loyaltyConfig = useMemo(() => {
    if (!selectedFacility) return null;
    return getFacilityLoyaltyConfig(selectedFacility.id);
  }, [selectedFacility]);

  // Referral program active for THIS facility? Reads the canonical
  // referralProgramSetup (Configure Program wizard) + legacy fallback.
  const referralEnabled = useMemo(
    () => isReferralProgramEnabled(loyaltyConfig),
    [loyaltyConfig],
  );

  // Personal referral code, auto-generated on the customer's loyalty account
  // (e.g. ALICE-PET) — see generateReferralCode in the account-creation path.
  const referralCode = useMemo(() => {
    if (!selectedFacility) return "";
    return (
      getLoyaltyAccount(selectedFacility.id, customerId ?? 0)?.referralCode ??
      ""
    );
  }, [customerId, selectedFacility]);

  // Generate referral URL
  const referralUrl = useMemo(() => {
    if (!referralCode || !selectedFacility) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/signup?ref=${referralCode}&facility=${selectedFacility.id}`;
  }, [referralCode, selectedFacility]);

  // The customer's first name, for the {referrerName} share-message token.
  const referrerName = useMemo(() => {
    const full =
      customerId == null ? "" : (getClientById(customerId)?.name ?? "");
    return full.split(/\s+/)[0] || t("aFriend");
  }, [customerId, t]);

  // Pre-composed share message from the program's shareMessageTemplate, with
  // tokens substituted ({code}, {referrerName}, {refereeReward}, {referrerReward}).
  const shareMessage = useMemo(() => {
    const setup = loyaltyConfig?.referralProgramSetup;
    if (setup) {
      return renderReferralTemplate(setup.shareMessageTemplate, {
        code: referralCode,
        referrerName,
        refereeReward: referralRewardText(
          setup.refereeReward.rewardType,
          setup.refereeReward.rewardValue,
        ),
        referrerReward: referralRewardText(
          setup.referrerReward.rewardType,
          setup.referrerReward.rewardValue,
        ),
      });
    }
    // No template: the words are ours, so they are the sender's language.
    // (A facility's template above is the facility's words, and its reward
    // tokens stay in English like its own wizard preview.)
    const friendReward =
      loyaltyConfig?.referralProgram?.refereeReward.description ??
      t("aSpecialReward");
    return fill("fallbackShareMessage", {
      facility: selectedFacility?.name ?? t("thisPlace"),
      code: referralCode,
      reward: friendReward,
    });
  }, [loyaltyConfig, referralCode, referrerName, selectedFacility, t, fill]);

  // Normalised reward explanation — works from the new referralProgramSetup
  // model or the legacy nested referralProgram.
  const rewardView = useMemo(() => {
    const setup = loyaltyConfig?.referralProgramSetup;
    if (setup) {
      const conditions = [
        setup.minimumSpend != null
          ? fill("condMinimumSpend", {
              amount: formatMoney(setup.minimumSpend, locale, {
                whole: Number.isInteger(setup.minimumSpend),
              }),
            })
          : null,
        setup.codeExpiryDays != null
          ? fill("condCodeExpiry", { n: setup.codeExpiryDays })
          : null,
        setup.maxUsagePerCode != null
          ? fill("condMaxUses", { n: setup.maxUsagePerCode })
          : null,
      ].filter((c): c is string => c !== null);
      return {
        youGet: referralRewardFullText(setup.referrerReward, locale),
        friendGets: referralRewardFullText(setup.refereeReward, locale),
        when: t(WHEN_KEY[setup.rewardTrigger] ?? "whenFirstBooking"),
        conditions,
      };
    }
    const legacy = loyaltyConfig?.referralProgram;
    if (legacy) {
      const conditions = [
        legacy.requirements?.minimumPurchase
          ? fill("condMinimumSpend", {
              amount: formatMoney(legacy.requirements.minimumPurchase, locale, {
                whole: Number.isInteger(legacy.requirements.minimumPurchase),
              }),
            })
          : null,
        legacy.requirements?.firstBookingOnly
          ? t("condFirstBookingOnly")
          : null,
        legacy.tracking?.expirationDays
          ? fill("condCodeExpiresIn", { n: legacy.tracking.expirationDays })
          : null,
      ].filter((c): c is string => c !== null);
      return {
        youGet:
          legacy.referrerReward.description ||
          String(legacy.referrerReward.value),
        friendGets:
          legacy.refereeReward.description ||
          String(legacy.refereeReward.value),
        when: legacy.requirements?.firstBookingOnly
          ? t("whenFirstBooking")
          : t("whenQualifyingBooking"),
        conditions,
      };
    }
    return null;
  }, [loyaltyConfig, t, fill, locale]);

  // Concise label for the referrer's reward, for the My Referrals table.
  const referrerRewardLabel = useMemo(() => {
    const setup = loyaltyConfig?.referralProgramSetup;
    if (setup)
      return referralRewardText(
        setup.referrerReward.rewardType,
        setup.referrerReward.rewardValue,
        locale,
      );
    const legacy = loyaltyConfig?.referralProgram;
    if (legacy)
      return (
        legacy.referrerReward.description || String(legacy.referrerReward.value)
      );
    return t("aReward");
  }, [loyaltyConfig, t, locale]);

  // Get referral relationships
  const referralRelationships = useMemo(() => {
    return getReferralRelationshipsByReferrer(customerId ?? 0);
  }, [customerId]);

  // Get referral stats
  const referralStatsData = useMemo(() => {
    return getReferralStats(customerId ?? 0);
  }, [customerId]);

  // Get referral tracking data from relationships
  const referralTracking = useMemo((): ReferralTracking[] => {
    return referralRelationships.map((rel) => {
      const friend = clients.find((c) => c.id === rel.referredCustomerId);
      // Privacy: show only the friend's first name, or "Someone" if we can't
      // identify them yet (e.g. they signed up but aren't linked to a profile).
      const firstName = friend?.name?.split(/\s+/)[0];
      const friendName = firstName || t("someone");

      // Consolidated 3-state status: Reward Issued → Booked → Pending.
      const pillStatus: ReferralPillStatus =
        rel.referrerRewardStatus === "issued"
          ? "reward_issued"
          : rel.firstBookingId || rel.status === "completed"
            ? "booked"
            : "pending";

      return {
        id: rel.referredCustomerId,
        friendName,
        friendKnown: Boolean(firstName),
        pillStatus,
        rewardEarned: rel.referrerRewardStatus === "issued",
        referredOn: rel.createdAt,
      };
    });
  }, [referralRelationships, t]);

  // Use stats from referral tracking system
  const referralStats = useMemo(() => {
    return {
      totalSent: referralStatsData.totalReferrals,
      signedUp:
        referralStatsData.activeReferrals +
        referralStatsData.completedReferrals,
      booked: referralStatsData.completedReferrals,
      rewardsEarned: referralStatsData.rewardsEarned,
      rewardsPending: referralStatsData.rewardsPending,
      totalRewardsEarned: referralStatsData.totalRewardValue,
    };
  }, [referralStatsData]);

  // Copy referral code
  const handleCopyCode = async () => {
    if (!referralCode) {
      toast.error(t("noReferralCode"));
      return;
    }
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success(t("codeCopied"));
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(t("failedToCopyCode"));
    }
  };

  // Copy referral link
  const handleCopyLink = async () => {
    if (!referralUrl) {
      toast.error(t("linkNotAvailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t("failedToCopyLink"));
    }
  };

  // Share via WhatsApp — opens wa.me with the pre-composed message + link.
  const handleShareWhatsApp = () => {
    if (!referralUrl) {
      toast.error(t("linkNotAvailable"));
      return;
    }
    const text = encodeURIComponent(`${shareMessage} ${referralUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    toast.success(t("openingWhatsapp"));
  };

  // Share via SMS
  const handleShareSMS = () => {
    if (!referralUrl) {
      toast.error(t("linkNotAvailable"));
      return;
    }
    const body = encodeURIComponent(`${shareMessage} ${referralUrl}`);
    window.location.href = `sms:?body=${body}`;
    toast.success(t("openingSms"));
  };

  // Share via Email
  const handleShareEmail = () => {
    if (!referralUrl) {
      toast.error(t("linkNotAvailable"));
      return;
    }
    const subject = encodeURIComponent(
      fill("joinMeAt", {
        facility: selectedFacility?.name || t("myFavouritePlace"),
      }),
    );
    const body = encodeURIComponent(`${shareMessage}\n\n${referralUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success(t("openingEmail"));
  };

  // Earned reward notifications
  const earnedRewardNotifications = useMemo(() => {
    return referralTracking
      .filter((r) => r.rewardEarned && !dismissedRewardNotifications.has(r.id))
      .map((r) => ({
        id: r.id,
        friendName: r.friendName,
        friendKnown: r.friendKnown,
        rewardLabel: referrerRewardLabel,
      }));
  }, [referralTracking, dismissedRewardNotifications, referrerRewardLabel]);

  const handleDismissRewardNotification = (id: number) => {
    setDismissedRewardNotifications((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString || !isMounted) return "";
    return formatDateShort(dateString, locale);
  };

  // Consolidated referral status pill: Pending / Booked / Reward Issued.
  const getReferralPill = (status: ReferralPillStatus) => {
    switch (status) {
      case "reward_issued":
        return <Badge className="bg-green-500">{t("rewardIssued")}</Badge>;
      case "booked":
        return <Badge className="bg-blue-500">{t("booked")}</Badge>;
      default:
        return <Badge variant="outline">{t("pending")}</Badge>;
    }
  };

  // Wait for the session facility to resolve before judging availability,
  // otherwise we flash "Not Available" during hydration.
  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">{t("loading")}</div>
        </div>
      </div>
    );
  }

  if (!referralEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("programNotAvailable")}</CardTitle>
            <CardDescription>{t("programNotEnabled")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <PageHeader title={t("referAFriend")} description={t("shareAndEarn")} />

      {/* Reward Notification Banners */}
      {earnedRewardNotifications.map((notification) => (
        <div
          key={notification.id}
          className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-4"
        >
          <div className="flex items-center gap-3">
            <Gift className="size-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                {t("rewardEarned")}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {/* An unidentified friend is "a friend" mid-sentence, not a
                    capitalised "Someone" in the middle of it. */}
                {notification.friendKnown
                  ? fill("youEarnedFor", {
                      reward: notification.rewardLabel,
                      friend: notification.friendName,
                    })
                  : fill("youEarnedForAFriend", {
                      reward: notification.rewardLabel,
                    })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("dismissNotification")}
            className="shrink-0 text-green-600 hover:bg-green-500/20 hover:text-green-700 dark:text-green-400"
            onClick={() => handleDismissRewardNotification(notification.id)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground min-h-[2.6em] text-sm font-medium">
              {t("totalReferrals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground min-h-[2.6em] text-sm font-medium">
              {t("friendsSignedUp")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.signedUp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground min-h-[2.6em] text-sm font-medium">
              {t("friendsBooked")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.booked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground min-h-[2.6em] text-sm font-medium">
              {t("rewardsEarned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.rewardsEarned}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground min-h-[2.6em] text-sm font-medium">
              {t("rewardsPending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.rewardsPending}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* (1) Code display + (2) Share buttons */}
        <Card id="referral-share" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              {t("yourReferralLink")}
            </CardTitle>
            <CardDescription>{t("shareCodeOrLink")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralCode ? (
              <>
                {/* Large code display */}
                <div className="bg-primary/5 border-primary/20 rounded-lg border p-4 text-center">
                  <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("yourCode")}
                  </div>
                  <div className="text-primary mt-1 font-mono text-3xl font-bold tracking-wider break-all">
                    {referralCode}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleCopyCode} variant="outline">
                    {copiedCode ? (
                      <CheckCircle2 className="mr-2 size-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 size-4" />
                    )}
                    {t("copyCode")}
                  </Button>
                  <Button onClick={handleCopyLink} variant="outline">
                    {copiedLink ? (
                      <CheckCircle2 className="mr-2 size-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 size-4" />
                    )}
                    {t("copyLink")}
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="referral-link"
                    className="text-muted-foreground text-xs"
                  >
                    {t("yourUniqueLink")}
                  </Label>
                  <Input
                    id="referral-link"
                    value={referralUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>

                {/* Share buttons */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("shareVia")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={handleShareWhatsApp}
                      variant="outline"
                      className="text-green-600 dark:text-green-400"
                    >
                      <MessageCircle className="mr-2 size-4" />
                      {/* french-ok: a brand name */}
                      WhatsApp
                    </Button>
                    <Button onClick={handleShareSMS} variant="outline">
                      <MessageSquare className="mr-2 size-4" />
                      {t("sms")}
                    </Button>
                    <Button onClick={handleShareEmail} variant="outline">
                      <Mail className="mr-2 size-4" />
                      {t("email")}
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowQRCode(!showQRCode)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <QrCode className="mr-2 size-4" />
                    {showQRCode ? t("hideQrCode") : t("showQrCode")}
                  </Button>
                </div>

                {showQRCode && referralUrl && (
                  <div className="bg-muted flex flex-col items-center rounded-lg p-4">
                    <div className="border-border flex size-[200px] items-center justify-center rounded-lg border-2 bg-white p-4">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`}
                        alt={t("qrCode")}
                        width={200}
                        height={200}
                        className="size-full"
                        unoptimized
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {t("scanToShare")}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Users className="mx-auto mb-2 size-12 opacity-50" />
                <p>{t("noReferralCode")}</p>
                <p className="mt-1 text-xs">{t("contactSupportForCode")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* (3) Reward explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="size-5" />
              {t("howItWorks")}
            </CardTitle>
            <CardDescription>{t("whatYouBothGet")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rewardView ? (
              <>
                <div className="border-primary/20 bg-primary/10 rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="text-primary mt-0.5 size-5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{t("youGet")}</div>
                      <div className="text-primary text-sm font-medium">
                        {rewardView.youGet}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <UserPlus className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="text-sm font-semibold">
                        {t("yourFriendGets")}
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {rewardView.friendGets}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-muted-foreground mt-0.5 size-5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{t("when")}</div>
                      <div className="text-muted-foreground text-sm">
                        {rewardView.when}
                      </div>
                    </div>
                  </div>
                </div>

                {rewardView.conditions.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="mb-1 text-sm font-semibold">
                      {t("conditions")}
                    </div>
                    <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                      {rewardView.conditions.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Gift className="mx-auto mb-2 size-12 opacity-50" />
                <p>{t("programNotConfigured")}</p>
                <p className="mt-1 text-xs">{t("contactFacilityForInfo")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            {t("myReferrals")}
          </CardTitle>
          <CardDescription>{t("friendsWhoUsedCode")}</CardDescription>
        </CardHeader>
        <CardContent>
          {referralTracking.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      {t("colFriend")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      {t("colReferredOn")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      {t("colStatus")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      {t("colReward")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralTracking.map((referral, index) => (
                    <tr
                      key={index}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {referral.friendName}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">
                        {formatDate(referral.referredOn) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {getReferralPill(referral.pillStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            referral.rewardEarned
                              ? "font-medium text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          }
                        >
                          {referrerRewardLabel}
                        </span>
                        <span className="text-muted-foreground ml-1 text-xs">
                          {referral.rewardEarned
                            ? t("issuedParen")
                            : t("pendingParen")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="bg-primary/10 mb-3 flex size-14 items-center justify-center rounded-full">
                <Gift className="text-primary size-7" />
              </div>
              <p className="font-semibold">{t("noReferralsYet")}</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                {rich(t("inviteWithCode"), {
                  code: (
                    <span className="text-foreground font-mono font-semibold">
                      {referralCode}
                    </span>
                  ),
                })}
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  document
                    .getElementById("referral-share")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Share2 className="mr-2 size-4" />
                {t("shareNow")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
