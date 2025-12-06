"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Users,
  Tag,
  Plus,
  Send,
  Edit,
  Trash2,
  Copy,
  Eye,
  Award,
  Target,
  Settings,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  emailTemplates,
  customerSegments,
  campaigns,
  loyaltySettings,
  customerLoyaltyData,
  referralCodes,
  badges,
  promoCodes,
} from "@/data/marketing";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmailTemplateModal } from "@/components/marketing/EmailTemplateModal";
import { SegmentBuilderModal } from "@/components/marketing/SegmentBuilderModal";
import { CampaignBuilderModal } from "@/components/marketing/CampaignBuilderModal";
import { PromoCodeModal } from "@/components/marketing/PromoCodeModal";
import { LoyaltySettingsModal } from "@/components/marketing/LoyaltySettingsModal";

export default function MarketingPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof emailTemplates)[0] | null
  >(null);
  const [selectedCampaign, setSelectedCampaign] = useState<
    (typeof campaigns)[0] | null
  >(null);

  // Email Template Columns
  const templateColumns: ColumnDef<(typeof emailTemplates)[0]>[] = [
    {
      accessorKey: "name",
      header: "Template Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.subject}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "timesUsed",
      header: "Times Used",
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTemplate(row.original);
              setShowTemplateModal(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTemplate(row.original);
              setShowTemplateModal(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              alert(`Template "${row.original.name}" has been copied!`);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Segment Columns
  const segmentColumns: ColumnDef<(typeof customerSegments)[0]>[] = [
    {
      accessorKey: "name",
      header: "Segment Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "customerCount",
      header: "Customers",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.customerCount} customers
        </Badge>
      ),
    },
    {
      accessorKey: "filters",
      header: "Filters",
      cell: ({ row }) => `${row.original.filters.length} filters`,
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSegmentModal(true);
              alert(
                `Edit segment "${row.original.name}" - Opens segment editor`,
              );
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              alert(`Segment "${row.original.name}" has been deleted!`);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Campaign Columns
  const campaignColumns: ColumnDef<(typeof campaigns)[0]>[] = [
    {
      accessorKey: "name",
      header: "Campaign Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground capitalize">
            {row.original.type} Campaign
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusColors = {
          draft: "secondary",
          scheduled: "default",
          sending: "default",
          sent: "outline",
          paused: "destructive",
        } as const;
        return (
          <Badge
            variant={statusColors[row.original.status]}
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "stats.sent",
      header: "Sent",
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCampaign(row.original);
              setShowCampaignModal(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                alert(`Campaign "${row.original.name}" has been sent!`);
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Referral Code Columns
  const referralColumns: ColumnDef<(typeof referralCodes)[0]>[] = [
    {
      accessorKey: "code",
      header: "Referral Code",
      cell: ({ row }) => (
        <div className="font-mono font-semibold">{row.original.code}</div>
      ),
    },
    {
      accessorKey: "referrerId",
      header: "Referrer",
      cell: ({ row }) => `Client #${row.original.referrerId}`,
    },
    {
      accessorKey: "referrerReward",
      header: "Referrer Reward",
      cell: ({ row }) => `$${row.original.referrerReward}`,
    },
    {
      accessorKey: "refereeReward",
      header: "Referee Reward",
      cell: ({ row }) => `$${row.original.refereeReward}`,
    },
    {
      accessorKey: "timesUsed",
      header: "Usage",
      cell: ({ row }) => (
        <div>
          <div>{row.original.timesUsed} times</div>
          {row.original.maxUses && (
            <div className="text-sm text-muted-foreground">
              Max: {row.original.maxUses}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Promo Code Columns
  const promoColumns: ColumnDef<(typeof promoCodes)[0]>[] = [
    {
      accessorKey: "code",
      header: "Promo Code",
      cell: ({ row }) => (
        <div>
          <div className="font-mono font-semibold">{row.original.code}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        let displayValue = "";
        if (row.original.type === "percentage") {
          displayValue = `${row.original.value}% off`;
        } else if (row.original.type === "fixed") {
          displayValue = `$${row.original.value} off`;
        } else {
          displayValue = String(row.original.value);
        }
        return (
          <div>
            <Badge variant="outline" className="capitalize">
              {row.original.type}
            </Badge>
            <div className="text-sm mt-1">{displayValue}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "usedCount",
      header: "Usage",
      cell: ({ row }) => (
        <div>
          <div>{row.original.usedCount} times</div>
          {row.original.usageLimit && (
            <div className="text-sm text-muted-foreground">
              Limit: {row.original.usageLimit}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "validUntil",
      header: "Valid Until",
      cell: ({ row }) => new Date(row.original.validUntil).toLocaleDateString(),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowPromoModal(true);
              alert(
                `Edit promo code "${row.original.code}" - Opens promo editor`,
              );
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(row.original.code);
              alert(`Promo code "${row.original.code}" copied to clipboard!`);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Email campaigns, loyalty programs, and promotions
          </p>
        </div>
      </div>

      {/* Marketing Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users className="h-4 w-4 mr-2" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="loyalty">
            <Award className="h-4 w-4 mr-2" />
            Loyalty
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Target className="h-4 w-4 mr-2" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="promos">
            <Tag className="h-4 w-4 mr-2" />
            Promo Codes
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email & SMS Campaigns</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and manage marketing campaigns
                  </p>
                </div>
                <Button onClick={() => setShowCampaignModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={campaignColumns}
                data={campaigns}
                searchColumn="name"
                searchPlaceholder="Search campaigns..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage reusable email templates
                  </p>
                </div>
                <Button onClick={() => setShowTemplateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={templateColumns}
                data={emailTemplates}
                searchColumn="name"
                searchPlaceholder="Search templates..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Segments</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build targeted customer groups
                  </p>
                </div>
                <Button onClick={() => setShowSegmentModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={segmentColumns}
                data={customerSegments}
                searchColumn="name"
                searchPlaceholder="Search segments..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          {/* Loyalty Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Points Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loyaltySettings.pointsPerDollar} pt / $1
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  100 pts = ${loyaltySettings.pointsValue}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Tiers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loyaltySettings.tiers.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Loyalty tiers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customerLoyaltyData.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enrolled customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Points Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customerLoyaltyData.reduce(
                    (sum, c) => sum + c.lifetimePoints,
                    0,
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime points
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Loyalty Tiers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Loyalty Tiers</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tier benefits and requirements
                  </p>
                </div>
                <Button onClick={() => setShowLoyaltyModal(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loyaltySettings.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    style={{ borderColor: tier.color }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                        <div>
                          <div className="font-semibold text-lg">
                            {tier.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tier.minPoints}+ points required
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tier.benefits.map((benefit, idx) => (
                          <Badge key={idx} variant="outline">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {tier.discountPercentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Discount
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Achievement Badges</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Customer milestones and rewards
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="text-4xl">{badge.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{badge.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {badge.description}
                      </div>
                      {badge.reward && (
                        <Badge variant="secondary" className="mt-2">
                          Reward:{" "}
                          {badge.reward.type === "discount" &&
                            `${badge.reward.value}% off`}
                          {badge.reward.type === "points" &&
                            `${badge.reward.value} points`}
                          {badge.reward.type === "freebie" &&
                            badge.reward.value}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Referral Codes</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer referral program
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const newCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    alert(`New referral code generated: ${newCode}`);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={referralColumns}
                data={referralCodes}
                searchColumn="code"
                searchPlaceholder="Search referral codes..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promo Codes Tab */}
        <TabsContent value="promos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Promo Codes</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discount codes and special offers
                  </p>
                </div>
                <Button onClick={() => setShowPromoModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promo Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={promoColumns}
                data={promoCodes}
                searchColumn="code"
                searchPlaceholder="Search promo codes..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <EmailTemplateModal
            template={selectedTemplate ?? undefined}
            onClose={() => {
              setShowTemplateModal(false);
              setSelectedTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSegmentModal} onOpenChange={setShowSegmentModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <SegmentBuilderModal onClose={() => setShowSegmentModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <CampaignBuilderModal
            campaign={selectedCampaign ?? undefined}
            onClose={() => {
              setShowCampaignModal(false);
              setSelectedCampaign(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <PromoCodeModal onClose={() => setShowPromoModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showLoyaltyModal} onOpenChange={setShowLoyaltyModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <LoyaltySettingsModal onClose={() => setShowLoyaltyModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
