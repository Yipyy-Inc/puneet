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
  Share2,
  QrCode,
  Gift,
  TrendingUp,
  Clock,
  UserPlus,
  Info,
  Mail,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { referralCodes } from "@/data/marketing";
import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";
import { clients } from "@/data/clients";
import {
  getReferralRelationshipsByReferrer,
  getReferralStats,
} from "@/data/referral-tracking";
import { useCustomerLoyaltyAccess } from "@/hooks/use-loyalty-config";
// QR Code will be generated using an external service or canvas

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface ReferralTracking {
  id: number;
  friendName: string;
  friendEmail?: string;
  status: "signed_up" | "booked" | "completed" | "pending";
  rewardStatus: "earned" | "pending" | "not_eligible";
  rewardAmount?: number | string;
  signedUpDate?: string;
  bookedDate?: string;
  completedDate?: string;
}

export default function CustomerReferPage() {
  const { selectedFacility } = useCustomerFacility();
  const { canViewReferrals } = useCustomerLoyaltyAccess();
  const isMounted = useHydrated();
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [dismissedRewardNotifications, setDismissedRewardNotifications] =
    useState<Set<number>>(new Set());

  // Get facility loyalty config
  const loyaltyConfig = useMemo(() => {
    if (!selectedFacility) return null;
    return getFacilityLoyaltyConfig(selectedFacility.id);
  }, [selectedFacility]);

  // Get referral code for this customer
  const referralCode = useMemo(() => {
    return referralCodes.find((ref) => ref.referrerId === MOCK_CUSTOMER_ID);
  }, []);

  // Generate referral URL
  const referralUrl = useMemo(() => {
    if (!referralCode || !selectedFacility) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/signup?ref=${referralCode.code}&facility=${selectedFacility.id}`;
  }, [referralCode, selectedFacility]);

  // Get referral program config
  const referralProgram = useMemo(() => {
    if (!loyaltyConfig?.referralProgram) return null;
    return loyaltyConfig.referralProgram;
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
      // Find customer info
      const friend = clients.find((c) => c.id === rel.referredCustomerId);

      // Determine status
      let status: ReferralTracking["status"] = "pending";
      if (rel.status === "completed") {
        status = "completed";
      } else if (rel.firstBookingId) {
        status = "booked";
      } else if (rel.status === "active") {
        status = "signed_up";
      }

      // Determine reward status
      let rewardStatus: ReferralTracking["rewardStatus"] = "not_eligible";
      if (rel.referrerRewardStatus === "issued") {
        rewardStatus = "earned";
      } else if (
        rel.referrerRewardStatus === "pending" ||
        rel.referrerRewardStatus === "eligible"
      ) {
        rewardStatus = "pending";
      }

      return {
        id: rel.referredCustomerId,
        friendName: friend?.name || `Customer #${rel.referredCustomerId}`,
        friendEmail: friend?.email,
        status,
        rewardStatus,
        rewardAmount: rel.referrerRewardValue,
        signedUpDate: rel.createdAt,
        bookedDate: rel.firstBookingDate,
        completedDate: rel.referrerRewardIssuedAt,
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

  // Share referral link
  const handleShare = async () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }

    const shareData = {
      title: `Join ${selectedFacility?.name || "us"}!`,
      text: `Use my referral link to get ${referralProgram?.refereeReward.description || "a special reward"}!`,
      url: referralUrl,
    };

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch {
        // User cancelled or error occurred
        handleCopyLink();
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  // Share via SMS
  const handleShareSMS = () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    const smsBody = encodeURIComponent(
      `Hey! I love ${selectedFacility?.name || "this pet care place"} and thought you would too. ` +
        `Use my referral link to get ${referralProgram?.refereeReward.description || "a special reward"}: ${referralUrl}`,
    );
    window.location.href = `sms:?body=${smsBody}`;
    toast.success("Opening SMS app...");
  };

  // Share via Email
  const handleShareEmail = () => {
    if (!referralUrl) {
      toast.error("Referral link not available");
      return;
    }
    const subject = encodeURIComponent(
      `Join me at ${selectedFacility?.name || "this great pet care place"}!`,
    );
    const body = encodeURIComponent(
      `Hi!\n\n` +
        `I've been using ${selectedFacility?.name || "this pet care facility"} for my pets and I think you'd love it too!\n\n` +
        `Sign up using my referral link and you'll get ${referralProgram?.refereeReward.description || "a special reward"}:\n` +
        `${referralUrl}\n\n` +
        `See you there!`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Opening email app...");
  };

  // Earned reward notifications
  const earnedRewardNotifications = useMemo(() => {
    return referralTracking
      .filter(
        (r) =>
          r.rewardStatus === "earned" &&
          !dismissedRewardNotifications.has(r.id),
      )
      .map((r) => ({
        id: r.id,
        friendName: r.friendName,
        rewardAmount: r.rewardAmount,
        rewardType: referralProgram?.referrerReward.type || "credit",
      }));
  }, [referralTracking, dismissedRewardNotifications, referralProgram]);

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

  // Get status badge
  const getStatusBadge = (status: ReferralTracking["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "booked":
        return <Badge className="bg-blue-500">Booked</Badge>;
      case "signed_up":
        return <Badge className="bg-yellow-500">Signed Up</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Get reward status badge
  const getRewardStatusBadge = (status: ReferralTracking["rewardStatus"]) => {
    switch (status) {
      case "earned":
        return <Badge className="bg-green-500">Earned</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">Not Eligible</Badge>;
    }
  };

  if (!canViewReferrals) {
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

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
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
            <Gift className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                Reward Earned!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                You earned{" "}
                {typeof notification.rewardAmount === "number"
                  ? `$${notification.rewardAmount}`
                  : notification.rewardAmount}{" "}
                {notification.rewardType === "free_service"
                  ? "free service"
                  : notification.rewardType === "gift_card"
                    ? "gift card"
                    : notification.rewardType === "free_add_on"
                      ? "free add-on"
                      : notification.rewardType === "discount_code"
                        ? "discount code"
                        : notification.rewardType}{" "}
                for referring {notification.friendName}!
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
        {/* Personal Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends to earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralCode ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="referral-link">
                    Your Unique Referral Link
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral-link"
                      value={referralUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleShare} variant="default">
                    <Share2 className="mr-2 size-4" />
                    Share
                  </Button>
                  <Button onClick={handleShareSMS} variant="outline">
                    <MessageSquare className="mr-2 size-4" />
                    SMS
                  </Button>
                  <Button onClick={handleShareEmail} variant="outline">
                    <Mail className="mr-2 size-4" />
                    Email
                  </Button>
                  <Button
                    onClick={() => setShowQRCode(!showQRCode)}
                    variant="outline"
                  >
                    <QrCode className="mr-2 size-4" />
                    QR Code
                  </Button>
                </div>

                {showQRCode && referralUrl && (
                  <div className="bg-muted flex flex-col items-center rounded-lg p-4">
                    <div className="border-border flex h-[200px] w-[200px] items-center justify-center rounded-lg border-2 bg-white p-4">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`}
                        alt="QR Code"
                        width={200}
                        height={200}
                        className="h-full w-full"
                        unoptimized
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Scan to share your referral link
                    </p>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="text-muted-foreground flex items-start gap-2 text-sm">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Your referral code:{" "}
                      <span className="text-foreground font-mono font-semibold">
                        {referralCode.code}
                      </span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No referral code available</p>
                <p className="mt-1 text-xs">
                  Contact support to get your referral code
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Reward Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Earn rewards when your friends sign up and book
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralProgram ? (
              <>
                <div className="space-y-3">
                  <div className="border-primary/20 bg-primary/10 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <Gift className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <div className="mb-1 text-sm font-semibold">
                          You Get:
                        </div>
                        <div className="text-sm">
                          {referralProgram.referrerReward.type === "points" && (
                            <span className="text-primary font-semibold">
                              {referralProgram.referrerReward.value} points
                            </span>
                          )}
                          {referralProgram.referrerReward.type === "credit" && (
                            <span className="text-primary font-semibold">
                              ${referralProgram.referrerReward.value} credit
                            </span>
                          )}
                          {referralProgram.referrerReward.type ===
                            "discount" && (
                            <span className="text-primary font-semibold">
                              {referralProgram.referrerReward.value}% discount
                            </span>
                          )}
                          <span className="text-muted-foreground ml-2">
                            {referralProgram.referrerReward.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <div className="mb-1 text-sm font-semibold">
                          Your Friend Gets:
                        </div>
                        <div className="text-sm">
                          {referralProgram.refereeReward.type === "points" && (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {referralProgram.refereeReward.value} points
                            </span>
                          )}
                          {referralProgram.refereeReward.type === "credit" && (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              ${referralProgram.refereeReward.value} credit
                            </span>
                          )}
                          {referralProgram.refereeReward.type ===
                            "discount" && (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {referralProgram.refereeReward.value}% off first
                              booking
                            </span>
                          )}
                          <span className="text-muted-foreground ml-2">
                            {referralProgram.refereeReward.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {referralProgram.requirements && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-sm font-semibold">Requirements:</div>
                    <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                      {referralProgram.requirements.minimumPurchase && (
                        <li>
                          Friend must make a minimum purchase of $
                          {referralProgram.requirements.minimumPurchase}
                        </li>
                      )}
                      {referralProgram.requirements.firstBookingOnly && (
                        <li>Reward applies to first booking only</li>
                      )}
                      {referralProgram.requirements.serviceTypes && (
                        <li>
                          Applies to:{" "}
                          {referralProgram.requirements.serviceTypes.join(", ")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {referralProgram.tracking?.expirationDays && (
                  <div className="border-t pt-3">
                    <div className="text-muted-foreground flex items-start gap-2 text-sm">
                      <Clock className="mt-0.5 size-4 shrink-0" />
                      <p>
                        Referral code expires in{" "}
                        {referralProgram.tracking.expirationDays} days
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="text-muted-foreground">
                      <p className="text-foreground mb-1 font-semibold">
                        When Reward Triggers:
                      </p>
                      <p>
                        {referralProgram.requirements?.firstBookingOnly
                          ? "After your friend completes their first booking"
                          : "After your friend completes a qualifying booking"}
                        {referralProgram.requirements?.minimumPurchase && (
                          <span>
                            {" "}
                            with a minimum purchase of $
                            {referralProgram.requirements.minimumPurchase}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <Gift className="mx-auto mb-2 h-12 w-12 opacity-50" />
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
            <TrendingUp className="h-5 w-5" />
            Referral Tracking
          </CardTitle>
          <CardDescription>
            Track your referrals and earned rewards
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
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Reward
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-sm font-semibold">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralTracking.map((referral, index) => (
                    <tr
                      key={index}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium">
                            {referral.friendName}
                          </div>
                          {referral.friendEmail && (
                            <div className="text-muted-foreground text-xs">
                              {referral.friendEmail}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(referral.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getRewardStatusBadge(referral.rewardStatus)}
                          {referral.rewardAmount && (
                            <div className="text-muted-foreground text-xs">
                              {typeof referral.rewardAmount === "number"
                                ? `$${referral.rewardAmount}`
                                : referral.rewardAmount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm">
                        <div className="space-y-1">
                          {referral.signedUpDate && (
                            <div>
                              Signed up: {formatDate(referral.signedUpDate)}
                            </div>
                          )}
                          {referral.bookedDate && (
                            <div>Booked: {formatDate(referral.bookedDate)}</div>
                          )}
                          {referral.completedDate && (
                            <div>
                              Completed: {formatDate(referral.completedDate)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No referrals yet</p>
              <p className="mt-1 text-xs">
                Share your referral link to start earning rewards!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
