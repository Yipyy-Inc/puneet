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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Package,
  CheckCircle,
} from "lucide-react";

export function FacilitySubscriptionsTable() {
  const [subscriptions, setSubscriptions] = useState<FacilitySubscription[]>(
    facilitySubscriptions,
  );
  const [selectedSubscription, setSelectedSubscription] =
    useState<FacilitySubscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  const renderActions = (item: FacilitySubscription) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            setSelectedSubscription(item);
            setShowDetailsModal(true);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSelectedSubscription(item);
            setShowEditModal(true);
          }}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Subscription
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setSelectedSubscription(item);
            setShowModulesModal(true);
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Manage Modules
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSelectedSubscription(item);
            setShowUpgradeModal(true);
          }}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Upgrade Tier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            setSelectedSubscription(item);
            setShowCancelModal(true);
          }}
        >
          <Archive className="mr-2 h-4 w-4" />
          Cancel Subscription
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleCancelSubscription = () => {
    if (!selectedSubscription) return;
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubscription.id
          ? { ...sub, status: "cancelled" as const }
          : sub,
      ),
    );
    setShowCancelModal(false);
    setSelectedSubscription(null);
  };

  const handleUpgrade = () => {
    if (!selectedSubscription) return;
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubscription.id
          ? { ...sub, tierName: "Enterprise", tierId: "tier-enterprise" }
          : sub,
      ),
    );
    setShowUpgradeModal(false);
    setSelectedSubscription(null);
  };

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

      {/* View Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Subscription Details
            </DialogTitle>
            <DialogDescription>
              {selectedSubscription?.facilityName}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Facility</p>
                  <p className="font-medium">
                    {selectedSubscription.facilityName}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Tier</p>
                  <Badge variant="outline">
                    {selectedSubscription.tierName}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge
                    className={getStatusColor(selectedSubscription.status)}
                  >
                    {selectedSubscription.status}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Billing Cycle
                  </p>
                  <p className="font-medium capitalize">
                    {selectedSubscription.billingCycle}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Cost
                  </p>
                  <p className="font-medium">
                    {formatCurrency(
                      selectedSubscription.billing.totalCost,
                      selectedSubscription.billing.currency,
                    )}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium">
                    {formatDate(selectedSubscription.endDate)}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Enabled Modules ({selectedSubscription.enabledModules.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSubscription.enabledModules.map((module) => (
                    <Badge key={module} variant="outline">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Subscription
            </DialogTitle>
            <DialogDescription>
              Update subscription for {selectedSubscription?.facilityName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select defaultValue={selectedSubscription?.billingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select defaultValue={selectedSubscription?.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEditModal(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Modules Modal */}
      <Dialog open={showModulesModal} onOpenChange={setShowModulesModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Modules
            </DialogTitle>
            <DialogDescription>
              Enable or disable modules for {selectedSubscription?.facilityName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Current modules:{" "}
              {selectedSubscription?.enabledModules.length || 0}
            </p>
            <div className="space-y-2">
              {selectedSubscription?.enabledModules.map((module) => (
                <div
                  key={module}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{module}</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModulesModal(false)}
            >
              Close
            </Button>
            <Button onClick={() => setShowModulesModal(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Tier Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Upgrade Tier
            </DialogTitle>
            <DialogDescription>
              Upgrade subscription tier for {selectedSubscription?.facilityName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Tier</p>
              <Badge variant="outline">{selectedSubscription?.tierName}</Badge>
            </div>
            <div className="space-y-2">
              <Label>Select New Tier</Label>
              <Select defaultValue="enterprise">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpgrade}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Archive className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Cancel subscription for {selectedSubscription?.facilityName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action will cancel the
                subscription. The facility will lose access to all premium
                features at the end of the billing period.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription}>
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
