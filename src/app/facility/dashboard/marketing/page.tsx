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
  Braces,
  MessageSquare,
  Star,
  Heart,
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
  type CustomerSegment,
} from "@/data/marketing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmailTemplateModal } from "@/components/marketing/EmailTemplateModal";
import { SegmentBuilderModal } from "@/components/marketing/SegmentBuilderModal";
import { CampaignBuilderModal } from "@/components/marketing/CampaignBuilderModal";
import { PromoCodeModal } from "@/components/marketing/PromoCodeModal";
import { FacilityBrandingSection } from "@/components/marketing/FacilityBrandingSection";
import { PlaydateAlertsTab } from "@/components/marketing/PlaydateAlertsTab";
import { LoyaltyBuilderModal } from "@/components/marketing/LoyaltyBuilderModal";
import { ReferralConfigModal } from "@/components/marketing/ReferralConfigModal";
import { QuickReplyModal } from "@/components/marketing/QuickReplyModal";
import { TemplatePreviewPanel } from "@/components/shared/TemplatePreviewPanel";
import { quickReplyTemplates } from "@/data/quick-replies";

export default function MarketingPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showReferralConfigModal, setShowReferralConfigModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof emailTemplates)[0] | null
  >(null);
  const [selectedCampaign, setSelectedCampaign] = useState<
    (typeof campaigns)[0] | null
  >(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<
    (typeof emailTemplates)[0] | null
  >(null);
  const [selectedSegment, setSelectedSegment] =
    useState<CustomerSegment | null>(null);

  // Campaign analytics
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const avgOpenRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce(
          (sum, c) =>
            sum +
            (c.stats.sent > 0 ? (c.stats.opened / c.stats.sent) * 100 : 0),
          0,
        ) / sentCampaigns.length
      : 0;
  const avgClickRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce(
          (sum, c) =>
            sum +
            (c.stats.opened > 0 ? (c.stats.clicked / c.stats.opened) * 100 : 0),
          0,
        ) / sentCampaigns.length
      : 0;

  // Email Template Columns
  const templateColumns: ColumnDef<(typeof emailTemplates)[0]>[] = [
    {
      accessorKey: "name",
      header: "Template Name",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.variables.length > 0 && (
              <Badge
                variant="secondary"
                className="gap-0.5 px-1.5 py-0 text-xs"
              >
                <Braces className="h-2.5 w-2.5" />
                {row.original.variables.length}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-sm">
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
      accessorKey: "useCase",
      header: "Use Case",
      cell: ({ row }) =>
        row.original.useCase ? (
          <Badge variant="secondary" className="text-xs capitalize">
            {row.original.useCase.replace(/_/g, " ")}
          </Badge>
        ) : null,
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
            aria-label="Preview template"
            title="Preview"
            onClick={() => {
              setPreviewTemplate(row.original);
              setShowPreviewModal(true);
            }}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Edit template"
            title="Edit"
            onClick={() => {
              setSelectedTemplate(row.original);
              setShowTemplateModal(true);
            }}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy template"
            title="Copy"
            onClick={() => {
              navigator.clipboard.writeText(row.original.body);
              console.log(`Template "${row.original.name}" copied`);
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Segment Columns (updated for new data model)
  const segmentColumns: ColumnDef<CustomerSegment>[] = [
    {
      accessorKey: "name",
      header: "Segment Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
          )}
          <div>
            <div className="flex items-center gap-1.5 font-medium">
              {row.original.name}
              {row.original.isBuiltIn && (
                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                  Built-in
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground text-sm">
              {row.original.description}
            </div>
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
      accessorKey: "filterGroups",
      header: "Filters",
      cell: ({ row }) => {
        const totalFilters = row.original.filterGroups.reduce(
          (sum: number, g: { filters: unknown[] }) => sum + g.filters.length,
          0,
        );
        return `${totalFilters} filter${totalFilters !== 1 ? "s" : ""} in ${row.original.filterGroups.length} group${row.original.filterGroups.length !== 1 ? "s" : ""}`;
      },
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
              setSelectedSegment(row.original);
              setShowSegmentModal(true);
            }}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log(`Delete segment "${row.original.name}"`);
            }}
            aria-label={`Delete segment ${row.original.name}`}
          >
            <Trash2 className="size-4" />
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
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm capitalize">
            {row.original.type} Campaign
            {row.original.goal && (
              <Badge
                variant="outline"
                className="px-1 py-0 text-[10px] capitalize"
              >
                {row.original.goal.replace(/_/g, " ")}
              </Badge>
            )}
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
      accessorKey: "stats.opened",
      header: "Open Rate",
      cell: ({ row }) => {
        const { sent, opened } = row.original.stats;
        if (sent === 0) return "-";
        return `${((opened / sent) * 100).toFixed(1)}%`;
      },
    },
    {
      accessorKey: "stats.clicked",
      header: "Click Rate",
      cell: ({ row }) => {
        const { opened, clicked } = row.original.stats;
        if (opened === 0) return "-";
        return `${((clicked / opened) * 100).toFixed(1)}%`;
      },
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
            <Eye className="size-4" />
          </Button>
          {row.original.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log(`Send campaign "${row.original.name}"`);
              }}
            >
              <Send className="size-4" />
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
            <div className="text-muted-foreground text-sm">
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
          <div className="text-muted-foreground text-sm">
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
            <div className="mt-1 text-sm">{displayValue}</div>
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
            <div className="text-muted-foreground text-sm">
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
            }}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(row.original.code);
              console.log(`Promo code "${row.original.code}" copied`);
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Email campaigns, segments, playdate alerts, loyalty programs, and
            promotions
          </p>
        </div>
      </div>

      {/* Marketing Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="campaigns">
              <Send className="mr-2 size-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Mail className="mr-2 size-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="segments">
              <Users className="mr-2 size-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="playdate-alerts">
              <Heart className="mr-2 size-4" />
              Playdate Alerts
            </TabsTrigger>
            <TabsTrigger value="loyalty">
              <Award className="mr-2 size-4" />
              Loyalty
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Target className="mr-2 size-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Tag className="mr-2 size-4" />
              Promo Codes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {sentCampaigns.length} sent
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Emails Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalSent.toLocaleString()}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Across all campaigns
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Open Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgOpenRate.toFixed(1)}%
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Across sent campaigns
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Click Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgClickRate.toFixed(1)}%
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Of opened emails
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email & SMS Campaigns</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create and manage marketing campaigns
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedCampaign(null);
                    setShowCampaignModal(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
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

        {/* Templates Tab (with Branding section) */}
        <TabsContent value="templates" className="space-y-4">
          {/* Branding Section */}
          <FacilityBrandingSection />

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Manage reusable email templates with branded preview
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowTemplateModal(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
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

          {/* Quick Reply Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-5" />
                    Quick Reply Templates
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Pre-written responses for chat and SMS conversations
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickReplyModal(true)}
                >
                  <Plus className="mr-2 size-4" />
                  New Quick Reply
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {quickReplyTemplates.map((reply) => (
                  <button
                    key={reply.name}
                    type="button"
                    className="group hover:bg-muted/50 cursor-pointer rounded-lg border p-3 text-left"
                    onClick={() =>
                      alert(`Quick reply "${reply.name}" copied to clipboard`)
                    }
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{reply.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {reply.category}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {reply.body}
                    </p>
                  </button>
                ))}
              </div>
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    Build targeted customer groups with AND/OR filter logic
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const csv = customerSegments
                        .map(
                          (s) =>
                            `${s.name},${s.customerCount},${s.description}`,
                        )
                        .join("\n");
                      const blob = new Blob(
                        [`Name,Customers,Description\n${csv}`],
                        { type: "text/csv" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "segments.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedSegment(null);
                      setShowSegmentModal(true);
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Create Segment
                  </Button>
                </div>
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

        {/* Playdate Alerts Tab */}
        <TabsContent value="playdate-alerts" className="space-y-4">
          <PlaydateAlertsTab />
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          {/* Loyalty Overview */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <p className="text-muted-foreground mt-1 text-xs">
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
                <p className="text-muted-foreground mt-1 text-xs">
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
                <p className="text-muted-foreground mt-1 text-xs">
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
                <p className="text-muted-foreground mt-1 text-xs">
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    Tier benefits and requirements
                  </p>
                </div>
                <Button onClick={() => setShowLoyaltyModal(true)}>
                  <Settings className="mr-2 size-4" />
                  Manage Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loyaltySettings.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    style={{ borderColor: tier.color }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-4 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                        <div>
                          <div className="text-lg font-semibold">
                            {tier.name}
                          </div>
                          <div className="text-muted-foreground text-sm">
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
                      <div className="text-primary text-2xl font-bold">
                        {tier.discountPercentage}%
                      </div>
                      <div className="text-muted-foreground text-sm">
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
              <p className="text-muted-foreground mt-1 text-sm">
                Customer milestones and rewards
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="text-4xl">{badge.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{badge.name}</div>
                      <div className="text-muted-foreground mt-1 text-sm">
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    Customer referral program
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowReferralConfigModal(true)}
                  >
                    <Settings className="mr-2 size-4" />
                    Configure Program
                  </Button>
                  <Button
                    onClick={() => {
                      const newCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                      alert(`New referral code generated: ${newCode}`);
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Generate Code
                  </Button>
                </div>
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    Discount codes and special offers
                  </p>
                </div>
                <Button onClick={() => setShowPromoModal(true)}>
                  <Plus className="mr-2 size-4" />
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
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <EmailTemplateModal
            template={selectedTemplate}
            onClose={() => {
              setShowTemplateModal(false);
              setSelectedTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSegmentModal} onOpenChange={setShowSegmentModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <SegmentBuilderModal
            segment={selectedSegment}
            onClose={() => {
              setShowSegmentModal(false);
              setSelectedSegment(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <CampaignBuilderModal
            campaign={selectedCampaign}
            onClose={() => {
              setShowCampaignModal(false);
              setSelectedCampaign(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <PromoCodeModal onClose={() => setShowPromoModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showLoyaltyModal} onOpenChange={setShowLoyaltyModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <LoyaltyBuilderModal onClose={() => setShowLoyaltyModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReferralConfigModal}
        onOpenChange={setShowReferralConfigModal}
      >
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <ReferralConfigModal
            onClose={() => setShowReferralConfigModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-h-[90vh] min-w-2xl overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{previewTemplate.name}</DialogTitle>
                <DialogDescription className="capitalize">
                  {previewTemplate.category} template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <TemplatePreviewPanel
                  template={previewTemplate.body}
                  subject={previewTemplate.subject}
                  emptyMessage="This template has no content"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showQuickReplyModal} onOpenChange={setShowQuickReplyModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <QuickReplyModal onClose={() => setShowQuickReplyModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
