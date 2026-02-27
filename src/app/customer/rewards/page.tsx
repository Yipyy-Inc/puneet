"use client";

import { useMemo, useState, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  GiftIcon,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { customerLoyaltyData, loyaltySettings, referralCodes, badges } from "@/data/marketing";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { payments } from "@/data/payments";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerRewardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get customer data
  const customer = useMemo(() => clients.find((c) => c.id === MOCK_CUSTOMER_ID), []);

  // Get loyalty data
  const loyaltyData = useMemo(() => {
    const customerLoyalty = customerLoyaltyData.find((l) => l.clientId === MOCK_CUSTOMER_ID);
    if (!customerLoyalty) return null;

    const currentTier = loyaltySettings.tiers.find((t) => t.id === customerLoyalty.tier);
    const nextTier = loyaltySettings.tiers.find(
      (t) => t.minPoints > customerLoyalty.points
    );
    const pointsToNextTier = nextTier ? nextTier.minPoints - customerLoyalty.points : 0;
    const currentTierMaxPoints = nextTier ? nextTier.minPoints : Infinity;
    const currentTierMinPoints = currentTier?.minPoints || 0;
    const progressInTier = customerLoyalty.points - currentTierMinPoints;
    const tierRange = currentTierMaxPoints - currentTierMinPoints;
    const progressPercentage = tierRange > 0 ? (progressInTier / tierRange) * 100 : 0;

    return {
      ...customerLoyalty,
      currentTier,
      nextTier,
      pointsToNextTier,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    };
  }, []);

  // Get referral codes for this customer
  const customerReferralCodes = useMemo(() => {
    return referralCodes.filter((ref) => ref.referrerId === MOCK_CUSTOMER_ID);
  }, []);

  // Get customer bookings to calculate stats
  const customerBookings = useMemo(() => {
    if (!selectedFacility) return [];
    return bookings.filter(
      (b) => b.clientId === MOCK_CUSTOMER_ID && b.facilityId === selectedFacility.id
    );
  }, [selectedFacility]);

  // Get customer payments to calculate total spent
  const customerPayments = useMemo(() => {
    if (!selectedFacility) return [];
    return payments.filter(
      (p) => p.clientId === MOCK_CUSTOMER_ID && p.facilityId === selectedFacility.id && p.status === "completed"
    );
  }, [selectedFacility]);

  const totalSpent = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [customerPayments]);

  // Calculate earned badges (mock logic - in production, this would check actual criteria)
  const earnedBadges = useMemo(() => {
    const bookingCount = customerBookings.length;
    const earned: typeof badges = [];

    badges.forEach((badge) => {
      let earnedBadge = false;
      if (badge.criteria.type === "bookings_count" && bookingCount >= badge.criteria.threshold) {
        earnedBadge = true;
      } else if (badge.criteria.type === "total_spent" && totalSpent >= badge.criteria.threshold) {
        earnedBadge = true;
      } else if (badge.criteria.type === "referrals" && customerReferralCodes.length > 0) {
        const totalReferrals = customerReferralCodes.reduce((sum, ref) => sum + ref.timesUsed, 0);
        if (totalReferrals >= badge.criteria.threshold) {
          earnedBadge = true;
        }
      }
      if (earnedBadge) {
        earned.push(badge);
      }
    });

    return earned;
  }, [customerBookings, totalSpent, customerReferralCodes]);

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!isMounted) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!isMounted) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Calculate points value in dollars
  const pointsValue = useMemo(() => {
    if (!loyaltyData || !loyaltySettings) return 0;
    return (loyaltyData.points / 100) * loyaltySettings.pointsValue;
  }, [loyaltyData]);

  if (!loyaltySettings.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Loyalty Program Not Available</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Loyalty & Rewards</h1>
          <p className="text-muted-foreground mt-1">
            Earn points, unlock rewards, and refer friends to earn more
          </p>
        </div>

        {/* Loyalty Points Overview Card */}
        {loyaltyData && (
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-primary/20">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold">{loyaltyData.points}</div>
                    <div className="text-sm text-muted-foreground">Points</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ≈ ${pointsValue.toFixed(2)} value
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">
                      {loyaltyData.currentTier?.name || "Bronze"} Tier
                    </div>
                    {loyaltyData.nextTier && (
                      <div className="text-xs text-muted-foreground">
                        {loyaltyData.pointsToNextTier} pts to {loyaltyData.nextTier.name}
                      </div>
                    )}
                  </div>
                  {loyaltyData.nextTier && (
                    <>
                      <Progress value={loyaltyData.progressPercentage} className="h-2 mb-1" />
                      <div className="text-xs text-muted-foreground">
                        {loyaltyData.points}/{loyaltyData.nextTier.minPoints} pts to {loyaltyData.nextTier.name}
                      </div>
                    </>
                  )}
                  {!loyaltyData.nextTier && (
                    <div className="text-xs text-muted-foreground mt-2">
                      You've reached the highest tier! 🎉
                    </div>
                  )}
                </div>
                <Button asChild>
                  <a href="#redeem">Redeem Points</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier Benefits */}
        {loyaltyData?.currentTier && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Current Tier Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loyaltyData.currentTier.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
              {loyaltyData.currentTier.discountPercentage > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm font-medium text-primary">
                    {loyaltyData.currentTier.discountPercentage}% discount on all services
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="points">Points History</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          {/* Points History Tab */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points History</CardTitle>
                <CardDescription>
                  Track how you've earned and redeemed points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loyaltyData && loyaltyData.pointsHistory.length > 0 ? (
                  <div className="space-y-3">
                    {loyaltyData.pointsHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background/60"
                      >
                        <div className="flex items-center gap-3">
                          {entry.type === "earned" ? (
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : entry.type === "redeemed" ? (
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                              <GiftIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                              <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{entry.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(entry.date)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            entry.points > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {entry.points > 0 ? "+" : ""}
                          {entry.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No points history yet</p>
                    <p className="text-xs mt-1">Start booking services to earn points!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{loyaltyData?.points || 0}</div>
                  <div className="text-sm text-muted-foreground">Current Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{loyaltyData?.lifetimePoints || 0}</div>
                  <div className="text-sm text-muted-foreground">Lifetime Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" id="redeem" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Redeem Points
                </CardTitle>
                <CardDescription>
                  Use your points to get discounts and rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loyaltyData && loyaltyData.points >= 100 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Points to Dollar Conversion */}
                      <Card className="border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold">Discount Voucher</div>
                              <div className="text-sm text-muted-foreground">
                                100 pts = ${loyaltySettings.pointsValue}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={loyaltyData.points < 100}
                              onClick={() => {
                                toast.success("Redeeming points...");
                                // TODO: Implement redemption logic
                              }}
                            >
                              Redeem
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Minimum 100 points required
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tier Discount Info */}
                      {loyaltyData.currentTier && loyaltyData.currentTier.discountPercentage > 0 && (
                        <Card className="border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-semibold">Tier Discount</div>
                                <div className="text-sm text-muted-foreground">
                                  {loyaltyData.currentTier.discountPercentage}% off all services
                                </div>
                              </div>
                              <Badge variant="default">Active</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Automatically applied at checkout
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-2">How to Redeem:</div>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Select a reward option above</li>
                        <li>Points will be deducted from your account</li>
                        <li>Discount code or credit will be applied automatically</li>
                        <li>Use it on your next booking or purchase</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>You need at least 100 points to redeem rewards</p>
                    <p className="text-xs mt-1">
                      You currently have {loyaltyData?.points || 0} points
                    </p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href="/customer/bookings">Book a Service to Earn Points</a>
                    </Button>
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
                  <Users className="h-5 w-5" />
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
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="text-sm font-medium">Your Referral Code</Label>
                              <Badge variant="outline" className="font-mono">
                                {refCode.code}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                You earn: <span className="font-semibold">${refCode.referrerReward}</span> per referral
                              </div>
                              <div>
                                Friend gets: <span className="font-semibold">${refCode.refereeReward}</span> off their first booking
                              </div>
                              <div>
                                Used: <span className="font-semibold">{refCode.timesUsed}</span>
                                {refCode.maxUses && ` / ${refCode.maxUses}`} times
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(refCode.code, refCode.id)}
                            >
                              {copiedCode === refCode.id ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
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
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No referral codes available</p>
                    <p className="text-xs mt-1">
                      Contact the facility to get your referral code
                    </p>
                  </div>
                )}

                {/* How Referrals Work */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-2">How Referrals Work:</div>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Share your unique referral code with friends</li>
                      <li>When they sign up and make their first booking using your code, they get a discount</li>
                      <li>You earn a reward credit for each successful referral</li>
                      <li>Rewards are automatically added to your account</li>
                    </ol>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Earned Badges
                </CardTitle>
                <CardDescription>
                  Unlock achievements and special rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {earnedBadges.map((badge) => (
                      <Card key={badge.id} className="border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{badge.icon}</div>
                            <div className="flex-1">
                              <div className="font-semibold mb-1">{badge.name}</div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {badge.description}
                              </div>
                              {badge.reward && (
                                <Badge variant="secondary" className="text-xs">
                                  Reward:{" "}
                                  {badge.reward.type === "discount"
                                    ? `${badge.reward.value}% off`
                                    : badge.reward.type === "points"
                                    ? `${badge.reward.value} points`
                                    : badge.reward.value}
                                </Badge>
                              )}
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No badges earned yet</p>
                    <p className="text-xs mt-1">Keep booking and referring to unlock badges!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
