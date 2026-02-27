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
  Info,
  X,
  Loader2,
} from "lucide-react";
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
  pointsEarningRules,
  type LoyaltyReward,
  type PointsEarningRule,
} from "@/data/marketing";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { payments } from "@/data/payments";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerRewardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

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

  // Format date helper (short format for table: "Jan 12")
  const formatDate = (dateString: string) => {
    if (!isMounted) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

        {/* Points Summary Card */}
        {loyaltyData && (
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Points Balance and Value */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-full bg-primary/20">
                      <Star className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <div className="text-4xl font-bold">
                        {loyaltyData.points.toLocaleString()} Points
                      </div>
                      {loyaltySettings.pointsValue > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          ≈ ${pointsValue.toFixed(2)} value
                        </div>
                      )}
                    </div>
                  </div>
                  <Button asChild>
                    <a href="#redeem">Redeem Points</a>
                  </Button>
                </div>

                {/* Tier and Progress */}
                {loyaltyData.currentTier && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="default" 
                          className="text-sm font-semibold"
                          style={{
                            backgroundColor: loyaltyData.currentTier.color || undefined,
                            color: loyaltyData.currentTier.color ? "#fff" : undefined,
                          }}
                        >
                          {loyaltyData.currentTier.name} Tier
                        </Badge>
                      </div>
                      {loyaltyData.nextTier && (
                        <div className="text-sm font-medium text-muted-foreground">
                          {loyaltyData.pointsToNextTier.toLocaleString()} points away from {loyaltyData.nextTier.name} Tier
                        </div>
                      )}
                      {!loyaltyData.nextTier && (
                        <div className="text-sm font-medium text-muted-foreground">
                          Highest tier achieved! 🎉
                        </div>
                      )}
                    </div>
                    
                    {loyaltyData.nextTier && (
                      <>
                        <Progress value={loyaltyData.progressPercentage} className="h-3" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {loyaltyData.points.toLocaleString()} / {loyaltyData.nextTier.minPoints.toLocaleString()} points
                          </span>
                          <span>
                            {Math.round(loyaltyData.progressPercentage)}% to {loyaltyData.nextTier.name}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Summary Text (Example Format) */}
                {loyaltyData.nextTier && (
                  <div className="pt-2 border-t">
                    <p className="text-base font-medium">
                      {loyaltyData.points.toLocaleString()} Points – {loyaltyData.pointsToNextTier.toLocaleString()} points away from {loyaltyData.nextTier.name} Tier
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How Points Are Earned */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              How Points Are Earned
            </CardTitle>
            <CardDescription>
              Ways to earn loyalty points at {selectedFacility?.name || "this facility"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pointsEarningRules.map((rule: PointsEarningRule, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                  <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{rule.description}</div>
                    {rule.applicableServices && rule.applicableServices.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Applies to: {rule.applicableServices.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                      </div>
                    )}
                    {rule.conditions && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <Info className="h-3 w-3 inline mr-1" />
                        {rule.conditions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                <CardTitle>Loyalty History</CardTitle>
                <CardDescription>
                  Track how you've earned and redeemed points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loyaltyData && loyaltyData.pointsHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Activity</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loyaltyData.pointsHistory
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((entry, index) => {
                            const isEarned = entry.type === "earned";
                            const isRedeemed = entry.type === "redeemed";
                            const isExpired = entry.type === "expired";
                            
                            return (
                              <tr
                                key={index}
                                className="border-b hover:bg-muted/50 transition-colors"
                              >
                                <td className="py-3 px-4 text-sm font-medium">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    {isEarned ? (
                                      <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/20">
                                        <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                      </div>
                                    ) : isRedeemed ? (
                                      <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/20">
                                        <GiftIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                      </div>
                                    ) : (
                                      <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/20">
                                        <Clock className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                      </div>
                                    )}
                                    <span className="text-sm">{entry.description}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={`font-semibold ${
                                      isEarned
                                        ? "text-green-600 dark:text-green-400"
                                        : isExpired
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    {entry.points > 0 ? "+" : ""}
                                    {entry.points}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
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
                      .filter((reward: LoyaltyReward) => reward.isActive && (reward.requiredPoints === 0 || loyaltyData.points >= reward.requiredPoints))
                      .map((reward: LoyaltyReward) => (
                        <Card key={reward.id} className="border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{reward.name}</h3>
                                  {reward.requiredPoints === 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      Visit-Based
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {reward.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                  {reward.requiredPoints > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Required: </span>
                                      <span className="font-semibold">{reward.requiredPoints.toLocaleString()} points</span>
                                    </div>
                                  )}
                                  {reward.expiryDays && (
                                    <div>
                                      <span className="text-muted-foreground">Expires: </span>
                                      <span className="font-semibold">{reward.expiryDays} days</span>
                                    </div>
                                  )}
                                  {reward.applicableServices && reward.applicableServices.length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Services: </span>
                                      <span className="font-semibold">
                                        {reward.applicableServices.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {reward.terms && (
                                  <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                                    <Info className="h-3 w-3 inline mr-1" />
                                    {reward.terms}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {reward.requiredPoints > 0 && (
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-primary">
                                      {reward.requiredPoints.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">points</div>
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  disabled={
                                    reward.requiredPoints > 0 && loyaltyData.points < reward.requiredPoints
                                  }
                                  onClick={() => {
                                    setSelectedReward(reward);
                                    setRedeemDialogOpen(true);
                                  }}
                                >
                                  {reward.requiredPoints === 0 ? "View Details" : "Redeem"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {/* Rewards Not Yet Available */}
                    {loyaltyRewards
                      .filter((reward: LoyaltyReward) => reward.isActive && reward.requiredPoints > 0 && loyaltyData.points < reward.requiredPoints)
                      .map((reward: LoyaltyReward) => (
                        <Card key={reward.id} className="border-muted opacity-60">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-muted-foreground">{reward.name}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {reward.description}
                                </p>
                                <div className="text-sm text-muted-foreground">
                                  Need {reward.requiredPoints.toLocaleString()} points • You have {loyaltyData.points.toLocaleString()} points
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-muted-foreground">
                                  {reward.requiredPoints.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">points</div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {reward.requiredPoints - loyaltyData.points} more needed
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                    {loyaltyRewards.filter((r: LoyaltyReward) => r.isActive).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No rewards available at this time</p>
                        <p className="text-xs mt-1">Check back later for new rewards!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-semibold mb-2">{selectedReward.name}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {selectedReward.description}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Points Required:</span>
                    <span className="font-semibold">{selectedReward.requiredPoints.toLocaleString()} points</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Your Points:</span>
                    <span className="font-semibold">{loyaltyData.points.toLocaleString()} points</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2 font-semibold">
                    <span>Points After Redemption:</span>
                    <span className="text-primary">
                      {(loyaltyData.points - selectedReward.requiredPoints).toLocaleString()} points
                    </span>
                  </div>
                </div>

                {selectedReward.terms && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-warning-foreground">
                        <div className="font-medium mb-1">Terms & Conditions:</div>
                        {selectedReward.terms}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm font-medium mb-1">What happens next:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {selectedReward.rewardType === "discount_code" && (
                      <p>• A discount code will be generated and added to your account</p>
                    )}
                    {selectedReward.rewardType === "credit_balance" && (
                      <p>• ${selectedReward.rewardValue} will be added to your account credit balance</p>
                    )}
                    {selectedReward.rewardType === "auto_apply" && (
                      <p>• This reward will automatically apply to your next eligible booking</p>
                    )}
                    {selectedReward.rewardType === "free_service" && (
                      <p>• A free service voucher will be added to your account</p>
                    )}
                    <p>• Points will be deducted from your account</p>
                    <p>• Transaction will be logged in your points history</p>
                    {selectedReward.expiryDays && (
                      <p>• Reward expires in {selectedReward.expiryDays} days</p>
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
                      rewardDetails = "Reward will be automatically applied to your next booking";
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
                  } catch (error: any) {
                    toast.error(error.message || "Failed to redeem reward");
                  } finally {
                    setIsRedeeming(false);
                  }
                }}
                disabled={isRedeeming || !selectedReward || !loyaltyData || loyaltyData.points < selectedReward.requiredPoints}
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  "Confirm Redemption"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
