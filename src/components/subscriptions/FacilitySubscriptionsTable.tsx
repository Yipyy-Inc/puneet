"use client";

import { useState } from "react";
import {
  FacilitySubscription,
  facilitySubscriptions,
  getSubscriptionsByStatus,
} from "@/data/facility-subscriptions";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export function FacilitySubscriptionsTable() {
  const [subscriptions] = useState<FacilitySubscription[]>(
    facilitySubscriptions,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "trial":
        return "bg-blue-500/10 text-blue-500";
      case "suspended":
        return "bg-yellow-500/10 text-yellow-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500";
      case "expired":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateUsagePercent = (sub: FacilitySubscription, metric: string) => {
    switch (metric) {
      case "users":
        const maxUsers =
          sub.customizations?.maxUsers || getTierLimit(sub.tierId, "maxUsers");
        return maxUsers === -1 ? 0 : (sub.usage.currentUsers / maxUsers) * 100;
      case "reservations":
        const maxReservations =
          sub.customizations?.maxReservations ||
          getTierLimit(sub.tierId, "maxReservations");
        return maxReservations === -1
          ? 0
          : (sub.usage.monthlyReservations / maxReservations) * 100;
      case "storage":
        const maxStorage =
          sub.customizations?.storageGB ||
          getTierLimit(sub.tierId, "storageGB");
        return maxStorage === -1
          ? 0
          : (sub.usage.storageUsedGB / maxStorage) * 100;
      default:
        return 0;
    }
  };

  const getTierLimit = (tierId: string, limitType: string): number => {
    // Mock function - would normally reference subscription-tiers data
    const limits: Record<string, Record<string, number>> = {
      "tier-beginner": {
        maxUsers: 5,
        maxReservations: 100,
        storageGB: 5,
      },
      "tier-pro": {
        maxUsers: 20,
        maxReservations: 500,
        storageGB: 25,
      },
      "tier-enterprise": {
        maxUsers: -1,
        maxReservations: -1,
        storageGB: 100,
      },
    };
    return limits[tierId]?.[limitType] || 0;
  };

  const columns: ColumnDef<FacilitySubscription>[] = [
    {
      key: "facilityName",
      label: "Facility",
      render: (item) => <div className="font-medium">{item.facilityName}</div>,
    },
    {
      key: "tierName",
      label: "Tier",
      render: (item) => <Badge variant="outline">{item.tierName}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <Badge variant="secondary" className={getStatusColor(item.status)}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "billingCycle",
      label: "Billing",
      render: (item) => <span className="capitalize">{item.billingCycle}</span>,
    },
    {
      key: "enabledModules",
      label: "Modules",
      render: (item) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{item.enabledModules.length}</span>
          <span className="text-muted-foreground text-sm">modules</span>
        </div>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (item) => {
        const userPercent = calculateUsagePercent(item, "users");
        const isHighUsage = userPercent > 80;
        return (
          <div className="flex items-center gap-2">
            <div className="text-sm">
              <span
                className={isHighUsage ? "text-orange-500 font-medium" : ""}
              >
                {Math.round(userPercent)}%
              </span>
            </div>
            {isHighUsage && <TrendingUp className="h-4 w-4 text-orange-500" />}
          </div>
        );
      },
    },
    {
      key: "billing",
      label: "Total Cost",
      render: (item) => (
        <div className="font-medium">
          {formatCurrency(item.billing.totalCost, item.billing.currency)}
          <span className="text-muted-foreground text-xs">
            /
            {item.billingCycle === "monthly"
              ? "mo"
              : item.billingCycle === "quarterly"
                ? "qtr"
                : "yr"}
          </span>
        </div>
      ),
    },
    {
      key: "endDate",
      label: "End Date",
      render: (item) => {
        const endDate = new Date(item.endDate);
        const today = new Date();
        const daysUntilEnd = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isExpiringSoon = daysUntilEnd <= 30 && daysUntilEnd > 0;

        return (
          <div className="flex items-center gap-2">
            <span className={isExpiringSoon ? "text-orange-500" : ""}>
              {formatDate(item.endDate)}
            </span>
            {isExpiringSoon && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </div>
        );
      },
    },
  ];

  const renderActions = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit Subscription
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <RefreshCw className="mr-2 h-4 w-4" />
          Manage Modules
        </DropdownMenuItem>
        <DropdownMenuItem>
          <TrendingUp className="mr-2 h-4 w-4" />
          Upgrade Tier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <Archive className="mr-2 h-4 w-4" />
          Cancel Subscription
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const activeSubscriptions = getSubscriptionsByStatus("active");
  const trialSubscriptions = getSubscriptionsByStatus("trial");
  const suspendedSubscriptions = getSubscriptionsByStatus("suspended");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Facility Subscriptions</h2>
        <p className="text-muted-foreground">
          View and manage subscriptions across all facilities
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="trial">
            Trial ({trialSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({suspendedSubscriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={subscriptions as unknown as Record<string, unknown>[]}
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
            searchKey="facilityName"
            searchPlaceholder="Search facilities..."
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={activeSubscriptions as unknown as Record<string, unknown>[]}
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
            searchKey="facilityName"
            searchPlaceholder="Search facilities..."
          />
        </TabsContent>

        <TabsContent value="trial" className="mt-4">
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={trialSubscriptions as unknown as Record<string, unknown>[]}
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
            searchKey="facilityName"
            searchPlaceholder="Search facilities..."
          />
        </TabsContent>

        <TabsContent value="suspended" className="mt-4">
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={
              suspendedSubscriptions as unknown as Record<string, unknown>[]
            }
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
            searchKey="facilityName"
            searchPlaceholder="Search facilities..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
