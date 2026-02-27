"use client";

import { useMemo, useState, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle,
  UserPlus,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { referralCodes, type ReferralCode } from "@/data/marketing";
import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { payments } from "@/data/payments";
import {
  getReferralRelationshipsByReferrer,
  getReferralStats,
  type ReferralRelationship,
} from "@/data/referral-tracking";
import { LoyaltyModuleGuard } from "@/components/loyalty/LoyaltyModuleGuard";
import { ConditionalLoyaltyFeature } from "@/components/loyalty/ConditionalLoyaltyFeature";
import { useCustomerLoyaltyAccess } from "@/hooks/use-loyalty-config";
// QR Code will be generated using an external service or canvas

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface ReferralTracking {
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
  const [isMounted, setIsMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if referrals are available
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

  // Get customer data
  const customer = useMemo(() => clients.find((c) => c.id === MOCK_CUSTOMER_ID), []);

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
      } else if (rel.referrerRewardStatus === "pending" || rel.referrerRewardStatus === "eligible") {
        rewardStatus = "pending";
      }

      return {
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
      signedUp: referralStatsData.activeReferrals + referralStatsData.completedReferrals,
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
    } catch (err) {
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

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err) {
        // User cancelled or error occurred
        handleCopyLink();
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
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

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Refer a Friend</h1>
        <p className="text-muted-foreground mt-2">
          Share your referral link and earn rewards when your friends book!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Friends Signed Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.signedUp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Friends Booked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.booked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rewards Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.rewardsEarned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rewards Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.rewardsPending}</div>
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
                  <Label htmlFor="referral-link">Your Unique Referral Link</Label>
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
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleShare} className="flex-1" variant="default">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                  <Button
                    onClick={() => setShowQRCode(!showQRCode)}
                    variant="outline"
                    className="flex-1"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {showQRCode ? "Hide" : "Show"} QR Code
                  </Button>
                </div>

                {showQRCode && referralUrl && (
                  <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                    <div className="w-[200px] h-[200px] bg-white p-4 rounded-lg border-2 border-border flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`}
                        alt="QR Code"
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Scan to share your referral link
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      Your referral code: <span className="font-mono font-semibold text-foreground">{referralCode.code}</span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No referral code available</p>
                <p className="text-xs mt-1">Contact support to get your referral code</p>
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
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Gift className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">You Get:</div>
                        <div className="text-sm">
                          {referralProgram.referrerReward.type === "points" && (
                            <span className="font-semibold text-primary">
                              {referralProgram.referrerReward.value} points
                            </span>
                          )}
                          {referralProgram.referrerReward.type === "credit" && (
                            <span className="font-semibold text-primary">
                              ${referralProgram.referrerReward.value} credit
                            </span>
                          )}
                          {referralProgram.referrerReward.type === "discount" && (
                            <span className="font-semibold text-primary">
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

                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-start gap-3">
                      <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">Your Friend Gets:</div>
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
                          {referralProgram.refereeReward.type === "discount" && (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {referralProgram.refereeReward.value}% off first booking
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
                  <div className="pt-3 border-t space-y-2">
                    <div className="font-semibold text-sm">Requirements:</div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      {referralProgram.requirements.minimumPurchase && (
                        <li>
                          Friend must make a minimum purchase of ${referralProgram.requirements.minimumPurchase}
                        </li>
                      )}
                      {referralProgram.requirements.firstBookingOnly && (
                        <li>Reward applies to first booking only</li>
                      )}
                      {referralProgram.requirements.serviceTypes && (
                        <li>
                          Applies to: {referralProgram.requirements.serviceTypes.join(", ")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {referralProgram.tracking?.expirationDays && (
                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>
                        Referral code expires in {referralProgram.tracking.expirationDays} days
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">When Reward Triggers:</p>
                      <p>
                        {referralProgram.requirements?.firstBookingOnly
                          ? "After your friend completes their first booking"
                          : "After your friend completes a qualifying booking"}
                        {referralProgram.requirements?.minimumPurchase && (
                          <span>
                            {" "}with a minimum purchase of ${referralProgram.requirements.minimumPurchase}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Referral program not configured</p>
                <p className="text-xs mt-1">Contact the facility for more information</p>
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Friend
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Reward
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralTracking.map((referral, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-sm">{referral.friendName}</div>
                          {referral.friendEmail && (
                            <div className="text-xs text-muted-foreground">
                              {referral.friendEmail}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(referral.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getRewardStatusBadge(referral.rewardStatus)}
                          {referral.rewardAmount && (
                            <div className="text-xs text-muted-foreground">
                              {typeof referral.rewardAmount === "number"
                                ? `$${referral.rewardAmount}`
                                : referral.rewardAmount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        <div className="space-y-1">
                          {referral.signedUpDate && (
                            <div>Signed up: {formatDate(referral.signedUpDate)}</div>
                          )}
                          {referral.bookedDate && (
                            <div>Booked: {formatDate(referral.bookedDate)}</div>
                          )}
                          {referral.completedDate && (
                            <div>Completed: {formatDate(referral.completedDate)}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-xs mt-1">Share your referral link to start earning rewards!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
