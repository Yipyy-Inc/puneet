"use client";

import Image from "next/image";
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
  REFERRAL_TRIGGER_HINTS,
} from "@/lib/loyalty/referral-program";
// QR Code will be generated using an external service or canvas

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type ReferralPillStatus = "pending" | "booked" | "reward_issued";

interface ReferralTracking {
  id: number;
  friendName: string;
  /** Consolidated status shown to the customer. */
  pillStatus: ReferralPillStatus;
  /** True once the referrer's reward has been issued. */
  rewardEarned: boolean;
  referredOn?: string;
}

export default function CustomerReferPage() {
  const { selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();
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
      getLoyaltyAccount(selectedFacility.id, MOCK_CUSTOMER_ID)?.referralCode ??
      ""
    );
  }, [selectedFacility]);

  // Generate referral URL
  const referralUrl = useMemo(() => {
    if (!referralCode || !selectedFacility) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/signup?ref=${referralCode}&facility=${selectedFacility.id}`;
  }, [referralCode, selectedFacility]);

  // The customer's first name, for the {referrerName} share-message token.
  const referrerName = useMemo(() => {
    const full = getClientById(MOCK_CUSTOMER_ID)?.name ?? "";
    return full.split(/\s+/)[0] || "A friend";
  }, []);

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
    const friendReward =
      loyaltyConfig?.referralProgram?.refereeReward.description ??
      "a special reward";
    return `I love ${selectedFacility?.name ?? "this place"}! Sign up with my code ${referralCode} to get ${friendReward}.`;
  }, [loyaltyConfig, referralCode, referrerName, selectedFacility]);

  // Normalised reward explanation — works from the new referralProgramSetup
  // model or the legacy nested referralProgram.
  const rewardView = useMemo(() => {
    const setup = loyaltyConfig?.referralProgramSetup;
    if (setup) {
      const conditions = [
        setup.minimumSpend != null
          ? `Your friend must spend at least $${setup.minimumSpend}.`
          : null,
        setup.codeExpiryDays != null
          ? `Your code expires ${setup.codeExpiryDays} days after it's issued.`
          : null,
        setup.maxUsagePerCode != null
          ? `Your code can be used up to ${setup.maxUsagePerCode} times.`
          : null,
      ].filter((c): c is string => c !== null);
      return {
        youGet: referralRewardFullText(setup.referrerReward),
        friendGets: referralRewardFullText(setup.refereeReward),
        when: REFERRAL_TRIGGER_HINTS[setup.rewardTrigger],
        conditions,
      };
    }
    const legacy = loyaltyConfig?.referralProgram;
    if (legacy) {
      const conditions = [
        legacy.requirements?.minimumPurchase
          ? `Friend must make a minimum purchase of $${legacy.requirements.minimumPurchase}.`
          : null,
        legacy.requirements?.firstBookingOnly
          ? "Reward applies to first booking only."
          : null,
        legacy.tracking?.expirationDays
          ? `Referral code expires in ${legacy.tracking.expirationDays} days.`
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
          ? "After your friend completes their first booking."
          : "After your friend completes a qualifying booking.",
        conditions,
      };
    }
    return null;
  }, [loyaltyConfig]);

  // Concise label for the referrer's reward, for the My Referrals table.
  const referrerRewardLabel = useMemo(() => {
    const setup = loyaltyConfig?.referralProgramSetup;
    if (setup)
      return referralRewardText(
        setup.referrerReward.rewardType,
        setup.referrerReward.rewardValue,
      );
    const legacy = loyaltyConfig?.referralProgram;
    if (legacy)
      return (
        legacy.referrerReward.description || String(legacy.referrerReward.value)
      );
    return "A reward";
  }, [loyaltyConfig]);

  // Get referral relationships
  const referralRelationships = useMemo(() => {
    return getReferralRelationshipsByReferrer(MOCK_CUSTOMER_ID);
  }, []);

  // Get referral stats
  const referralStatsData = useMemo(() => {
    return getReferralStats(MOCK_CUSTOMER_ID);
  }, []);

  // Get referral tracking data from relationships
  const referralTracking = useMemo((): ReferralTracking[] => {
    return referralRelationships.map((rel) => {
      const friend = clients.find((c) => c.id === rel.referredCustomerId);
      // Privacy: show only the friend's first name, or "Someone" if we can't
      // identify them yet (e.g. they signed up but aren't linked to a profile).
      const friendName = friend?.name
        ? (friend.name.split(/\s+/)[0] ?? "Someone")
        : "Someone";

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
        pillStatus,
        rewardEarned: rel.referrerRewardStatus === "issued",
        referredOn: rel.createdAt,
      };
    });
  }, [referralRelationships]);

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
      toast.error("No referral code available");
      return;
    }
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Copy referral link
  const handleCopyLink = async () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Share via WhatsApp — opens wa.me with the pre-composed message + link.
  const handleShareWhatsApp = () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    const text = encodeURIComponent(`${shareMessage} ${referralUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp...");
  };

  // Share via SMS
  const handleShareSMS = () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    const body = encodeURIComponent(`${shareMessage} ${referralUrl}`);
    window.location.href = `sms:?body=${body}`;
    toast.success("Opening SMS app...");
  };

  // Share via Email
  const handleShareEmail = () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    const subject = encodeURIComponent(
      `Join me at ${selectedFacility?.name || "my favourite pet care place"}!`,
    );
    const body = encodeURIComponent(`${shareMessage}\n\n${referralUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Opening email app...");
  };

  // Earned reward notifications
  const earnedRewardNotifications = useMemo(() => {
    return referralTracking
      .filter((r) => r.rewardEarned && !dismissedRewardNotifications.has(r.id))
      .map((r) => ({
        id: r.id,
        friendName: r.friendName,
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
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Consolidated referral status pill: Pending / Booked / Reward Issued.
  const getReferralPill = (status: ReferralPillStatus) => {
    switch (status) {
      case "reward_issued":
        return <Badge className="bg-green-500">Reward Issued</Badge>;
      case "booked":
        return <Badge className="bg-blue-500">Booked</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Wait for the session facility to resolve before judging availability,
  // otherwise we flash "Not Available" during hydration.
  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!referralEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Referral Program Not Available</CardTitle>
            <CardDescription>
              The referral program is not enabled for this facility.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Refer a Friend</h1>
        <p className="text-muted-foreground mt-2">
          Share your referral link and earn rewards when your friends book!
        </p>
      </div>

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
                Reward Earned!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                You earned {notification.rewardLabel} for referring{" "}
                {notification.friendName}!
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss notification"
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
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Friends Signed Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.signedUp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Friends Booked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.booked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Rewards Earned
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
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Rewards Pending
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
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share your code or link — you both get rewarded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralCode ? (
              <>
                {/* Large code display */}
                <div className="bg-primary/5 border-primary/20 rounded-lg border p-4 text-center">
                  <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Your code
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
                    Copy code
                  </Button>
                  <Button onClick={handleCopyLink} variant="outline">
                    {copiedLink ? (
                      <CheckCircle2 className="mr-2 size-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 size-4" />
                    )}
                    Copy link
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="referral-link"
                    className="text-muted-foreground text-xs"
                  >
                    Your unique link
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
                  <div className="text-sm font-medium">Share via</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={handleShareWhatsApp}
                      variant="outline"
                      className="text-green-600 dark:text-green-400"
                    >
                      <MessageCircle className="mr-2 size-4" />
                      WhatsApp
                    </Button>
                    <Button onClick={handleShareSMS} variant="outline">
                      <MessageSquare className="mr-2 size-4" />
                      SMS
                    </Button>
                    <Button onClick={handleShareEmail} variant="outline">
                      <Mail className="mr-2 size-4" />
                      Email
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowQRCode(!showQRCode)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <QrCode className="mr-2 size-4" />
                    {showQRCode ? "Hide QR code" : "Show QR code"}
                  </Button>
                </div>

                {showQRCode && referralUrl && (
                  <div className="bg-muted flex flex-col items-center rounded-lg p-4">
                    <div className="border-border flex size-[200px] items-center justify-center rounded-lg border-2 bg-white p-4">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`}
                        alt="QR Code"
                        width={200}
                        height={200}
                        className="size-full"
                        unoptimized
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Scan to share your referral link
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Users className="mx-auto mb-2 size-12 opacity-50" />
                <p>No referral code available</p>
                <p className="mt-1 text-xs">
                  Contact support to get your referral code
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* (3) Reward explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="size-5" />
              How It Works
            </CardTitle>
            <CardDescription>What you and your friend both get</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rewardView ? (
              <>
                <div className="border-primary/20 bg-primary/10 rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="text-primary mt-0.5 size-5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">You get</div>
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
                        Your friend gets
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
                      <div className="text-sm font-semibold">When</div>
                      <div className="text-muted-foreground text-sm">
                        {rewardView.when}
                      </div>
                    </div>
                  </div>
                </div>

                {rewardView.conditions.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="mb-1 text-sm font-semibold">Conditions</div>
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
                <p>Referral program not configured</p>
                <p className="mt-1 text-xs">
                  Contact the facility for more information
                </p>
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
            My Referrals
          </CardTitle>
          <CardDescription>
            Friends who used your code, and your reward status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralTracking.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Friend
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Referred on
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Reward
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
                          {referral.rewardEarned ? "(issued)" : "(pending)"}
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
              <p className="font-semibold">No referrals yet</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Invite a friend with your code{" "}
                <span className="text-foreground font-mono font-semibold">
                  {referralCode}
                </span>{" "}
                — when they book, you both get rewarded.
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
                Share now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
