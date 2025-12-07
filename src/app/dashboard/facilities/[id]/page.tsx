"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  facilities,
  availableModules,
  moduleQuotedPrices,
} from "@/data/facilities";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FacilityReports } from "@/components/facility/FacilityReports";
import { TenantActivityLogs } from "@/components/facility/TenantActivityLogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  Users,
  UserCheck,
  MapPin,
  CreditCard,
  MoreVertical,
  LogIn,
  Power,
  Pause,
  Archive,
  Settings,
  Key,
  Scissors,
  Dog,
  Home,
  AlertCircle,
  Puzzle,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  OverviewTab,
  LocationsTab,
  ClientsTab,
  StaffTab,
  BillingTab,
  ModulesTab,
} from "@/components/dashboard/facilities";

// Mock data
const revenueData = [
  { month: "Jan", revenue: 4500 },
  { month: "Feb", revenue: 5200 },
  { month: "Mar", revenue: 4800 },
  { month: "Apr", revenue: 6100 },
  { month: "May", revenue: 5500 },
  { month: "Jun", revenue: 6700 },
];

// Module usage mock data
const moduleUsageData: Record<
  string,
  { usage: string; lastUsed: string; actions: number }
> = {
  booking: { usage: "1,247 bookings", lastUsed: "2 hours ago", actions: 156 },
  scheduling: { usage: "89 shifts", lastUsed: "1 day ago", actions: 42 },
  customers: { usage: "432 profiles", lastUsed: "30 min ago", actions: 87 },
  financial: { usage: "12 reports", lastUsed: "3 days ago", actions: 24 },
  communication: {
    usage: "2,891 messages",
    lastUsed: "1 hour ago",
    actions: 203,
  },
  training: { usage: "15 programs", lastUsed: "1 week ago", actions: 8 },
  grooming: { usage: "567 appointments", lastUsed: "4 hours ago", actions: 92 },
  inventory: { usage: "234 items", lastUsed: "2 days ago", actions: 31 },
};

const recentActivities = [
  {
    id: 1,
    type: "booking",
    title: "New booking confirmed",
    description: "Sarah Johnson booked daycare for Max",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "payment",
    title: "Payment received",
    description: "$150.00 for grooming service",
    time: "4 hours ago",
  },
  {
    id: 3,
    type: "user",
    title: "New staff member added",
    description: "Emma Davis joined as Manager",
    time: "1 day ago",
  },
  {
    id: 4,
    type: "client",
    title: "Client profile updated",
    description: "John Smith updated pet information",
    time: "2 days ago",
  },
];

const tabs = [
  {
    id: "overview",
    name: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "locations",
    name: "Locations",
    icon: MapPin,
  },
  {
    id: "clients",
    name: "Clients",
    icon: UserCheck,
  },
  {
    id: "staff",
    name: "Staff",
    icon: Users,
  },
  {
    id: "billing",
    name: "Billing",
    icon: CreditCard,
  },
  {
    id: "modules",
    name: "Modules",
    icon: Puzzle,
  },
  {
    id: "reports",
    name: "Reports",
    icon: Shield,
  },
  {
    id: "logs",
    name: "Logs",
    icon: Shield,
  },
];

export default function FacilityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const facility = facilities.find((f) => f.id === Number(params.id));

  if (!facility) {
    notFound();
  }

  const [activeTab, setActiveTab] = useState("overview");
  const [currentStatus, setCurrentStatus] = useState(facility.status);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    newStatus: "active" | "inactive" | "suspended" | "archived";
  } | null>(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>(
    facility.enabledModules || [],
  );

  const activeClients = facility.clients.filter(
    (c) => c.status === "active",
  ).length;
  const services = facility.locationsList.flatMap((l) => l.services);
  const uniqueServices = [...new Set(services)];

  const totalRevenue = useMemo(
    () => revenueData.reduce((sum, d) => sum + d.revenue, 0),
    [],
  );

  // Get the quoted price for a module (custom quote or base price)
  const getModulePrice = (moduleId: string) => {
    const quoteKey = `${facility.id}-${moduleId}`;
    const mod = availableModules.find((m) => m.id === moduleId);
    if (!mod) return 0;
    return moduleQuotedPrices[quoteKey] ?? mod.basePrice;
  };

  // Check if module has a custom quoted price
  const hasCustomPrice = (moduleId: string) => {
    const quoteKey = `${facility.id}-${moduleId}`;
    return quoteKey in moduleQuotedPrices;
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "grooming":
        return Scissors;
      case "daycare":
        return Dog;
      case "boarding":
        return Home;
      default:
        return Building;
    }
  };

  const handleStatusChange = (
    newStatus: "active" | "inactive" | "suspended" | "archived",
  ) => {
    setStatusChangeModal({ newStatus });
  };

  const confirmStatusChange = () => {
    if (!statusChangeModal) return;
    setCurrentStatus(statusChangeModal.newStatus);
    setStatusChangeModal(null);
  };

  const handleImpersonate = () => {
    document.cookie = `user_role=facility_admin; path=/`;
    document.cookie = `impersonating_facility=${facility.id}; path=/`;
    router.push("/facility/dashboard");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            facility={facility}
            totalRevenue={totalRevenue}
            activeClients={activeClients}
            recentActivities={recentActivities}
            onNavigateToReports={() => setActiveTab("reports")}
            onNavigateToModules={() => setActiveTab("modules")}
            onNavigateToLogs={() => setActiveTab("logs")}
          />
        );

      case "locations":
        return <LocationsTab locations={facility.locationsList} />;

      case "clients":
        return <ClientsTab clients={facility.clients} />;

      case "staff":
        return <StaffTab usersList={facility.usersList} />;

      case "billing":
        return <BillingTab facility={facility} />;

      case "modules":
        return (
          <ModulesTab
            facilityName={facility.name}
            enabledModules={enabledModules}
            moduleUsageData={moduleUsageData}
            getModulePrice={getModulePrice}
            hasCustomPrice={hasCustomPrice}
            onModulesChange={setEnabledModules}
          />
        );

      case "reports":
        return (
          <FacilityReports
            facilityId={facility.id}
            facilityName={facility.name}
          />
        );

      case "logs":
        return (
          <TenantActivityLogs
            facilityId={facility.id}
            facilityName={facility.name}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/facilities")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {facility.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge type="status" value={currentStatus} showIcon />
                  <StatusBadge type="plan" value={facility.plan} showIcon />
                  {uniqueServices.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {uniqueServices.slice(0, 3).map((service) => {
                        const Icon = getServiceIcon(service);
                        return (
                          <Badge
                            key={service}
                            variant="secondary"
                            className="capitalize py-0.5 px-2 text-xs"
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {service}
                          </Badge>
                        );
                      })}
                      {uniqueServices.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="py-0.5 px-2 text-xs"
                        >
                          +{uniqueServices.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImpersonateDialog(true)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Impersonate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/facilities/new`)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Facility
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <Key className="mr-2 h-4 w-4" />
                    Manage Permissions
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Status Management</DropdownMenuLabel>

                  {currentStatus !== "active" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("active")}
                    >
                      <Power className="mr-2 h-4 w-4 text-success" />
                      <span className="text-success">Activate</span>
                    </DropdownMenuItem>
                  )}

                  {currentStatus === "active" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("inactive")}
                    >
                      <Power className="mr-2 h-4 w-4 text-muted-foreground" />
                      Deactivate
                    </DropdownMenuItem>
                  )}

                  {currentStatus !== "suspended" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("suspended")}
                    >
                      <Pause className="mr-2 h-4 w-4 text-warning" />
                      <span className="text-warning">Suspend</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => handleStatusChange("archived")}
                    className="text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? "bg-background border-b-2 border-primary text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">{renderTabContent()}</div>

      {/* Impersonation Dialog */}
      <Dialog
        open={showImpersonateDialog}
        onOpenChange={setShowImpersonateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate Facility Admin</DialogTitle>
            <DialogDescription>
              You are about to log in as the admin of{" "}
              <strong>{facility.name}</strong>. This session will be tracked for
              audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Facility:</span>
                <span className="font-medium">{facility.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{facility.plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge type="status" value={currentStatus} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImpersonateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleImpersonate}>
              <LogIn className="mr-2 h-4 w-4" />
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog
        open={!!statusChangeModal}
        onOpenChange={() => setStatusChangeModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of{" "}
              <strong>{facility.name}</strong> to{" "}
              <strong>{statusChangeModal?.newStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Status:</span>
                <StatusBadge type="status" value={currentStatus} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Status:</span>
                <StatusBadge
                  type="status"
                  value={statusChangeModal?.newStatus || "active"}
                />
              </div>
            </div>
            {statusChangeModal?.newStatus === "archived" && (
              <p className="text-sm text-destructive mt-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Archiving will hide this facility and disable all operations.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusChangeModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                statusChangeModal?.newStatus === "archived"
                  ? "destructive"
                  : "default"
              }
              onClick={confirmStatusChange}
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
