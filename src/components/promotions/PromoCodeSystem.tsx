"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tag,
  TrendingUp,
  Package,
  Gift,
  Users,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  promotions,
  promoCodeUsages,
  bundleDiscounts,
  firstTimeOffers,
  promotionStats,
} from "@/data/promotions";
import type {
  Promotion,
  PromoCodeUsage,
  BundleDiscount,
  FirstTimeOffer,
} from "@/data/promotions";

// Badge helper functions
const getScopeBadge = (scope: string) => {
  const variants: Record<string, "default" | "secondary"> = {
    "system-wide": "default",
    facility: "secondary",
  };
  return variants[scope] || "secondary";
};

const getStatusBadge = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    active: "default",
    scheduled: "secondary",
    expired: "destructive",
    paused: "outline",
  };
  return variants[status] || "outline";
};

const getDiscountTypeBadge = (type: string) => {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    percentage: "default",
    "fixed-amount": "secondary",
    bundle: "outline",
    "first-time": "default",
  };
  return variants[type] || "outline";
};

export function PromoCodeSystem() {
  const [activeTab, setActiveTab] = useState("active-promos");

  // Statistics Cards
  const statsCards = [
    {
      title: "Total Promotions",
      value: promotionStats.totalPromotions,
      subtitle: `${promotionStats.activePromotions} active`,
      icon: Tag,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Redemptions",
      value: promotionStats.totalRedemptions.toLocaleString(),
      subtitle: `${promotionStats.averageRedemptionRate}% avg rate`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Discount Given",
      value: `$${(promotionStats.totalDiscountGiven / 1000).toFixed(1)}K`,
      subtitle: "Total across all promos",
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Revenue Generated",
      value: `$${(promotionStats.totalRevenueGenerated / 1000).toFixed(1)}K`,
      subtitle: "From promotional bookings",
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  // Active Promotions columns
  const activePromosColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "code" as keyof Promotion,
      label: "Promo Details",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{promo.code as string}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {promo.name as string}
          </div>
          <div className="flex gap-1">
            <Badge
              variant={getScopeBadge(promo.scope as string)}
              className="text-xs"
            >
              {promo.scope as string}
            </Badge>
            {(promo.isFirstTimeOnly as boolean) && (
              <Badge variant="outline" className="text-xs">
                First-time
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "discountType" as keyof Promotion,
      label: "Discount",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <Badge
            variant={getDiscountTypeBadge(promo.discountType as string)}
            className="text-xs"
          >
            {promo.discountType === "percentage"
              ? `${promo.discountValue as number}%`
              : `$${promo.discountValue as number}`}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {promo.target as string}
          </div>
        </div>
      ),
    },
    {
      key: "usageLimit" as keyof Promotion,
      label: "Usage",
      render: (promo: Record<string, unknown>) => {
        const usagePercent = promo.usageLimit
          ? ((promo.usedCount as number) / (promo.usageLimit as number)) * 100
          : 0;
        return (
          <div className="space-y-2 min-w-[120px]">
            <div className="text-xs font-medium">
              {promo.usedCount as number} /{" "}
              {(promo.usageLimit as number) || "∞"}
            </div>
            {(promo.usageLimit as number) && (
              <Progress value={usagePercent} className="h-1.5" />
            )}
            <div className="text-xs text-muted-foreground">
              {(promo.usageLimit as number)
                ? `${usagePercent.toFixed(0)}% used`
                : "Unlimited"}
            </div>
          </div>
        );
      },
    },
    {
      key: "status" as keyof Promotion,
      label: "Status",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <Badge
            variant={getStatusBadge(promo.status as string)}
            className="text-xs"
          >
            {promo.status as string}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Until {new Date(promo.endDate as string).toLocaleDateString()}
          </div>
        </div>
      ),
    },
  ];

  // Promo Code Usage columns
  const usageColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "promoCode" as keyof PromoCodeUsage,
      label: "Code & Customer",
      render: (usage: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{usage.promoCode as string}</div>
          <div className="text-xs text-muted-foreground">
            {usage.customerName as string}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {usage.customerEmail as string}
          </div>
        </div>
      ),
    },
    {
      key: "facilityName" as keyof PromoCodeUsage,
      label: "Facility & Service",
      render: (usage: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium line-clamp-1">
            {usage.facilityName as string}
          </div>
          <div className="text-xs text-muted-foreground">
            {usage.service as string}
          </div>
        </div>
      ),
    },
    {
      key: "originalAmount" as keyof PromoCodeUsage,
      label: "Amount",
      render: (usage: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-xs line-through text-muted-foreground">
            ${usage.originalAmount as number}
          </div>
          <div className="text-sm font-medium text-green-600">
            ${usage.finalAmount as number}
          </div>
          <div className="text-xs text-orange-600">
            -${usage.discountAmount as number}
          </div>
        </div>
      ),
    },
    {
      key: "usedAt" as keyof PromoCodeUsage,
      label: "Used At",
      render: (usage: Record<string, unknown>) => (
        <div className="text-xs text-muted-foreground">
          {new Date(usage.usedAt as string).toLocaleString()}
        </div>
      ),
    },
  ];

  // Bundle Discounts columns
  const bundleColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "name" as keyof BundleDiscount,
      label: "Bundle Details",
      render: (bundle: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{bundle.name as string}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {bundle.description as string}
          </div>
          <Badge
            variant={getScopeBadge(bundle.scope as string)}
            className="text-xs"
          >
            {bundle.scope as string}
          </Badge>
        </div>
      ),
    },
    {
      key: "services" as keyof BundleDiscount,
      label: "Services & Discount",
      render: (bundle: Record<string, unknown>) => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {(bundle.services as string[]).map((service) => (
              <Badge key={service} variant="outline" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
          <Badge variant="default" className="text-xs">
            {bundle.discountPercentage as number}% off
          </Badge>
        </div>
      ),
    },
    {
      key: "redemptionCount" as keyof BundleDiscount,
      label: "Performance",
      render: (bundle: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {bundle.redemptionCount as number} redemptions
          </div>
          <div className="text-sm text-green-600">
            ${(bundle.totalRevenue as number).toLocaleString()} revenue
          </div>
        </div>
      ),
    },
    {
      key: "status" as keyof BundleDiscount,
      label: "Status",
      render: (bundle: Record<string, unknown>) => (
        <Badge
          variant={getStatusBadge(bundle.status as string)}
          className="text-xs"
        >
          {bundle.status as string}
        </Badge>
      ),
    },
  ];

  // First-Time Offers columns
  const firstTimeColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "name" as keyof FirstTimeOffer,
      label: "Offer Details",
      render: (offer: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{offer.name as string}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {offer.description as string}
          </div>
          <Badge
            variant={getScopeBadge(offer.scope as string)}
            className="text-xs"
          >
            {offer.scope as string}
          </Badge>
        </div>
      ),
    },
    {
      key: "discountType" as keyof FirstTimeOffer,
      label: "Discount & Services",
      render: (offer: Record<string, unknown>) => (
        <div className="space-y-2">
          <Badge
            variant={getDiscountTypeBadge(offer.discountType as string)}
            className="text-xs"
          >
            {offer.discountType === "percentage"
              ? `${offer.discountValue as number}%`
              : `$${offer.discountValue as number}`}
          </Badge>
          <div className="flex flex-wrap gap-1">
            {(offer.applicableServices as string[]).map((service) => (
              <Badge key={service} variant="outline" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "redemptionCount" as keyof FirstTimeOffer,
      label: "Performance",
      render: (offer: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {offer.redemptionCount as number} redemptions
          </div>
          <div className="text-sm text-green-600">
            {offer.conversionRate as number}% conversion
          </div>
        </div>
      ),
    },
    {
      key: "status" as keyof FirstTimeOffer,
      label: "Status",
      render: (offer: Record<string, unknown>) => (
        <div className="space-y-1">
          <Badge
            variant={getStatusBadge(offer.status as string)}
            className="text-xs"
          >
            {offer.status as string}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Valid until{" "}
            {new Date(offer.validUntil as string).toLocaleDateString()}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Performing Promotion Banner */}
      <div className="p-4 border rounded-lg bg-linear-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-purple-100">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Top Performing Promotion</h3>
            <p className="text-lg font-bold text-purple-600">
              {promotionStats.topPerformingPromo.code} -{" "}
              {promotionStats.topPerformingPromo.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {promotionStats.topPerformingPromo.redemptions} redemptions • $
              {promotionStats.topPerformingPromo.revenue.toLocaleString()}{" "}
              revenue
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-promos" className="gap-2">
            <Tag className="h-4 w-4" />
            Active Promos
          </TabsTrigger>
          <TabsTrigger value="usage-tracking" className="gap-2">
            <Users className="h-4 w-4" />
            Usage Tracking
          </TabsTrigger>
          <TabsTrigger value="bundles" className="gap-2">
            <Package className="h-4 w-4" />
            Bundle Discounts
          </TabsTrigger>
          <TabsTrigger value="first-time" className="gap-2">
            <Gift className="h-4 w-4" />
            First-Time Offers
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="active-promos"
          className="space-y-4 overflow-x-hidden"
        >
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Active Promotions</h3>
                <p className="text-sm text-muted-foreground">
                  Manage promo codes and track usage limits
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Create Promotion
              </button>
            </div>
            <DataTable
              data={
                promotions.filter(
                  (p) => p.status === "active",
                ) as unknown as Record<string, unknown>[]
              }
              columns={activePromosColumns}
            />
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Scheduled Promotions</h3>
              <p className="text-sm text-muted-foreground">
                Upcoming promotions ready to launch
              </p>
            </div>
            <DataTable
              data={
                promotions.filter(
                  (p) => p.status === "scheduled",
                ) as unknown as Record<string, unknown>[]
              }
              columns={activePromosColumns}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="usage-tracking"
          className="space-y-4 overflow-x-hidden"
        >
          <div className="border rounded-lg p-4 bg-card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Recent Redemptions</h3>
              <p className="text-sm text-muted-foreground">
                Track promo code usage across all facilities
              </p>
            </div>
            <DataTable
              data={promoCodeUsages as unknown as Record<string, unknown>[]}
              columns={usageColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4 overflow-x-hidden">
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Bundle Discount Packages
                </h3>
                <p className="text-sm text-muted-foreground">
                  Multi-service bundles with combined savings
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Create Bundle
              </button>
            </div>
            <DataTable
              data={bundleDiscounts as unknown as Record<string, unknown>[]}
              columns={bundleColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="first-time" className="space-y-4 overflow-x-hidden">
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  First-Time Customer Offers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Special introductory discounts for new customers
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Create Offer
              </button>
            </div>
            <DataTable
              data={firstTimeOffers as unknown as Record<string, unknown>[]}
              columns={firstTimeColumns}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
