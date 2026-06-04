"use client";

import { useEffect, useState } from "react";
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
  Megaphone,
  Sparkles,
  Coins,
  Crown,
  UserCheck,
  TrendingUp,
  Zap,
  CalendarClock,
  FileEdit,
  CheckCircle2,
  Gift,
  Percent,
  Filter,
  Ticket,
} from "lucide-react";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  emailTemplates,
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
import Link from "next/link";
import { ReferralConfigModal } from "@/components/marketing/ReferralConfigModal";
import { QuickReplyModal } from "@/components/marketing/QuickReplyModal";
import { TemplatePreviewPanel } from "@/components/shared/TemplatePreviewPanel";
import { quickReplyTemplates } from "@/data/quick-replies";
import {
  getMarketingCustomerSegments,
  subscribeToMarketingSegments,
} from "@/lib/marketing-segments";
import { LocationFilterBanner } from "@/components/hq/LocationFilterBanner";

export default function MarketingPage() {
  const [segmentsData, setSegmentsData] = useState<CustomerSegment[]>(() =>
    getMarketingCustomerSegments(),
  );
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
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
  const [campaignFilter, setCampaignFilter] = useState<
    "all" | "sent" | "scheduled" | "draft"
  >("all");

  useEffect(() => {
    setSegmentsData(getMarketingCustomerSegments());
    return subscribeToMarketingSegments(() => {
      setSegmentsData(getMarketingCustomerSegments());
    });
  }, []);

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
        const statusStyles: Record<typeof row.original.status, string> = {
          draft:
            "bg-muted text-muted-foreground",
          scheduled:
            "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
          sending:
            "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
          paused:
            "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        };
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              statusStyles[row.original.status],
            )}
          >
            {row.original.status}
          </span>
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
      header: "",
      cell: ({ row }) =>
        row.original.status === "draft" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log(`Send campaign "${row.original.name}"`);
            }}
          >
            <Send className="size-4" />
          </Button>
        ) : null,
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

  const totalLoyaltyMembers = customerLoyaltyData.length;
  const scheduledCampaigns = campaigns.filter(
    (c) => c.status === "scheduled",
  ).length;
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length;
  const activeCampaigns =
    scheduledCampaigns +
    campaigns.filter((c) => c.status === "sending").length;
  const filteredCampaigns =
    campaignFilter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === campaignFilter);
  const handleTileClick = (
    target: "all" | "sent" | "scheduled" | "draft",
  ) => {
    setCampaignFilter((prev) => (prev === target ? "all" : target));
  };

  return (
    <div className="space-y-6 p-6">
      <LocationFilterBanner />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
            <Badge className="gap-1 border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              <Zap className="h-3 w-3" />
              Active
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Email campaigns, segments, playdate alerts, loyalty programs, and
            promotions — everything you need to grow and retain customers.
          </p>
        </div>

        {/* Quick stats strip */}
        <div className="bg-muted/30 flex shrink-0 items-center gap-4 rounded-xl border px-4 py-3">
          <div className="text-center">
            <p className="text-muted-foreground text-xs leading-none">
              Loyalty Members
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-lg font-bold">{totalLoyaltyMembers}</span>
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="text-center">
            <p className="text-muted-foreground text-xs leading-none">
              Avg Open Rate
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-lg font-bold">
                {avgOpenRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="text-center">
            <p className="text-muted-foreground text-xs leading-none">
              Active Campaigns
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <Send className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-lg font-bold">{activeCampaigns}</span>
            </div>
          </div>
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
          {/* Clickable KPI tiles - filter the table below */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="All Campaigns"
              value={campaigns.length}
              hint={`${totalSent.toLocaleString()} emails sent total`}
              icon={Megaphone}
              tone="indigo"
              active={campaignFilter === "all"}
              onClick={() => handleTileClick("all")}
              trail={[
                { label: "open", value: `${avgOpenRate.toFixed(1)}%` },
                { label: "click", value: `${avgClickRate.toFixed(1)}%` },
              ]}
            />
            <KpiTile
              label="Sent"
              value={sentCampaigns.length}
              hint={`${totalSent.toLocaleString()} emails delivered`}
              icon={CheckCircle2}
              tone="emerald"
              active={campaignFilter === "sent"}
              onClick={() => handleTileClick("sent")}
              trail={[
                { label: "avg open", value: `${avgOpenRate.toFixed(1)}%` },
              ]}
            />
            <KpiTile
              label="Scheduled"
              value={scheduledCampaigns}
              hint="Queued for delivery"
              icon={CalendarClock}
              tone="amber"
              active={campaignFilter === "scheduled"}
              onClick={() => handleTileClick("scheduled")}
            />
            <KpiTile
              label="Drafts"
              value={draftCampaigns}
              hint="Need review before send"
              icon={FileEdit}
              tone="rose"
              active={campaignFilter === "draft"}
              onClick={() => handleTileClick("draft")}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="text-primary size-5" />
                    Email & SMS Campaigns
                    {campaignFilter !== "all" && (
                      <Badge
                        variant="secondary"
                        className="gap-1 capitalize"
                      >
                        <Filter className="size-3" />
                        {campaignFilter}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {campaignFilter === "all"
                      ? "Create and manage marketing campaigns"
                      : `Showing ${filteredCampaigns.length} ${campaignFilter} campaign${filteredCampaigns.length === 1 ? "" : "s"}`}
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
                data={filteredCampaigns}
                searchColumn="name"
                searchPlaceholder="Search campaigns..."
                onRowClick={(campaign) => {
                  setSelectedCampaign(campaign);
                  setShowCampaignModal(true);
                }}
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
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-5 text-blue-500" />
                    Email Templates
                  </CardTitle>
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
                    <MessageSquare className="size-5 text-emerald-500" />
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
                {quickReplyTemplates.map((reply) => {
                  const categoryStyles: Record<
                    string,
                    { pill: string; accent: string }
                  > = {
                    general: {
                      pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                      accent: "bg-slate-400",
                    },
                    booking: {
                      pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                      accent: "bg-blue-500",
                    },
                    payment: {
                      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                      accent: "bg-emerald-500",
                    },
                    medical: {
                      pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                      accent: "bg-red-500",
                    },
                  };
                  const styles =
                    categoryStyles[reply.category] ?? categoryStyles.general;
                  return (
                    <button
                      key={reply.name}
                      type="button"
                      className="group hover:bg-muted/50 hover:border-primary/30 relative cursor-pointer overflow-hidden rounded-lg border p-3 pl-4 text-left transition-all"
                      onClick={() =>
                        alert(`Quick reply "${reply.name}" copied to clipboard`)
                      }
                    >
                      <div
                        className={cn(
                          "absolute top-0 left-0 h-full w-1",
                          styles.accent,
                        )}
                      />
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {reply.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            styles.pill,
                          )}
                        >
                          {reply.category}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {reply.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          {/* Segment overview tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total Segments"
              value={segmentsData.length}
              hint={`${segmentsData.filter((s) => s.isBuiltIn).length} built-in`}
              icon={Users}
              tone="indigo"
            />
            <KpiTile
              label="Total Reach"
              value={segmentsData
                .reduce((sum, s) => sum + s.customerCount, 0)
                .toLocaleString()}
              hint="Customers across all segments"
              icon={UserCheck}
              tone="emerald"
            />
            <KpiTile
              label="Favorites"
              value={segmentsData.filter((s) => s.isFavorite).length}
              hint="Starred for quick access"
              icon={Star}
              tone="amber"
            />
            <KpiTile
              label="Custom"
              value={segmentsData.filter((s) => !s.isBuiltIn).length}
              hint="Created by your team"
              icon={Sparkles}
              tone="violet"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5 text-indigo-500" />
                    Customer Segments
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Build targeted customer groups with AND/OR filter logic
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const csv = segmentsData
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
                data={segmentsData}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Points Rate"
              value={`${loyaltySettings.pointsPerDollar} / $1`}
              hint={`100 pts = $${loyaltySettings.pointsValue}`}
              icon={Coins}
              tone="amber"
            />
            <KpiTile
              label="Active Tiers"
              value={loyaltySettings.tiers.length}
              hint="Loyalty tiers"
              icon={Crown}
              tone="violet"
            />
            <KpiTile
              label="Total Members"
              value={customerLoyaltyData.length}
              hint="Enrolled customers"
              icon={UserCheck}
              tone="indigo"
            />
            <KpiTile
              label="Points Issued"
              value={customerLoyaltyData
                .reduce((sum, c) => sum + c.lifetimePoints, 0)
                .toLocaleString()}
              hint="Lifetime points"
              icon={Sparkles}
              tone="emerald"
            />
          </div>

          {/* Loyalty Tiers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="size-5 text-violet-500" />
                    Loyalty Tiers
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Tier benefits and requirements
                  </p>
                </div>
                <Button asChild>
                  <Link href="/facility/dashboard/loyalty/setup">
                    <Settings className="mr-2 size-4" />
                    Manage Settings
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loyaltySettings.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="group relative flex items-center justify-between overflow-hidden rounded-xl border-2 p-4 transition-all hover:shadow-md"
                    style={{
                      borderColor: `${tier.color}40`,
                      background: `linear-gradient(135deg, ${tier.color}10 0%, transparent 60%)`,
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 h-full w-1.5"
                      style={{ backgroundColor: tier.color }}
                    />
                    <div className="flex-1 pl-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-9 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-110"
                          style={{ backgroundColor: tier.color }}
                        >
                          <Crown className="size-4.5 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold">
                            {tier.name}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {tier.minPoints.toLocaleString()}+ points required
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tier.benefits.map((benefit, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-background/60 backdrop-blur-sm"
                          >
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-3xl font-bold"
                        style={{ color: tier.color }}
                      >
                        {tier.discountPercentage}%
                      </div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
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
              <CardTitle className="flex items-center gap-2">
                <Award className="size-5 text-amber-500" />
                Achievement Badges
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Customer milestones and rewards
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="group from-muted/40 hover:border-primary/30 relative flex items-start gap-4 overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-3xl shadow-sm transition-transform group-hover:scale-110 dark:from-amber-900/40 dark:to-amber-800/40">
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{badge.name}</div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        {badge.description}
                      </div>
                      {badge.reward && (
                        <Badge
                          variant="secondary"
                          className="mt-2 gap-1 border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        >
                          <Sparkles className="size-3" />
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
          {/* Referral overview tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total Codes"
              value={referralCodes.length}
              hint={`${referralCodes.filter((r) => r.isActive).length} active`}
              icon={Target}
              tone="indigo"
            />
            <KpiTile
              label="Total Referrals"
              value={referralCodes.reduce((sum, r) => sum + r.timesUsed, 0)}
              hint="Successful sign-ups"
              icon={UserCheck}
              tone="emerald"
            />
            <KpiTile
              label="Rewards Paid"
              value={`$${referralCodes
                .reduce(
                  (sum, r) =>
                    sum + r.timesUsed * (r.referrerReward + r.refereeReward),
                  0,
                )
                .toLocaleString()}`}
              hint="Lifetime referrer + referee"
              icon={Gift}
              tone="amber"
            />
            <KpiTile
              label="Active Codes"
              value={referralCodes.filter((r) => r.isActive).length}
              hint="Currently redeemable"
              icon={Zap}
              tone="violet"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5 text-indigo-500" />
                    Referral Codes
                  </CardTitle>
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
          {/* Promo overview tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total Promo Codes"
              value={promoCodes.length}
              hint={`${promoCodes.filter((p) => p.isActive).length} active`}
              icon={Ticket}
              tone="indigo"
            />
            <KpiTile
              label="Total Redemptions"
              value={promoCodes.reduce((sum, p) => sum + p.usedCount, 0)}
              hint="Across all codes"
              icon={CheckCircle2}
              tone="emerald"
            />
            <KpiTile
              label="Active Codes"
              value={promoCodes.filter((p) => p.isActive).length}
              hint="Currently redeemable"
              icon={Zap}
              tone="amber"
            />
            <KpiTile
              label="% Discount Codes"
              value={
                promoCodes.filter((p) => p.type === "percentage").length
              }
              hint="vs. fixed-amount codes"
              icon={Percent}
              tone="violet"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="size-5 text-violet-500" />
                    Promo Codes
                  </CardTitle>
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
            segments={segmentsData}
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
