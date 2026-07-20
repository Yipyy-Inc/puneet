"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  facilities,
  availableModules,
  moduleQuotedPrices,
} from "@/data/facilities";
import {
  getTenantActivityLogs,
  getTenantAuditLogs,
  type TenantActivityLog,
  type TenantAuditLog,
} from "@/data/tenant-logs";
import {
  createImpersonationToken,
  IMPERSONATING_ADMIN,
} from "@/lib/impersonation";
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
  Database,
  FileSignature,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  OverviewTab,
  LocationsTab,
  ClientsTab,
  StaffTab,
  BillingTab,
  ModulesTab,
  DataExportTab,
  AgreementsTab,
} from "@/components/dashboard/facilities";
import { FacilitySuspensionBanner } from "./_components/facility-suspension-banner";

// Real per-facility module usage, derived from the facility's activity log
// (activity + audit trail) filtered by module. Every module in availableModules
// gets an entry — modules with genuine zero activity report "0" / "—" so the
// Modules tab never shows an indefinite loading skeleton.
type ModuleUsage = { usage: string; lastUsed: string; actions: number };

function relativeTime(iso: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000),
  );
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

function sameMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

// Map a raw log entry to the module short-id it belongs to (null = not a
// module-scoped event, e.g. security/system/config noise).
function moduleForActivityType(
  type: TenantActivityLog["actionType"],
): string | null {
  switch (type) {
    case "booking":
      return "booking";
    case "payment":
      return "financial";
    case "client":
    case "pet":
      return "customers";
    case "staff":
    case "user":
      return "scheduling";
    case "communication":
      return "communication";
    case "service":
      return "grooming";
    default:
      return null; // settings, system
  }
}

function moduleForAuditCategory(
  category: TenantAuditLog["category"],
): string | null {
  switch (category) {
    case "Booking":
      return "booking";
    case "Financial":
      return "financial";
    case "Client":
      return "customers";
    case "User Access":
      return "scheduling";
    default:
      return null; // Configuration, Security, Data, System
  }
}

// A discrete "action" is a created booking / processed transaction, as opposed
// to a passive access (view/update). Detected from the action verb.
const TRANSACTION_VERB =
  /^(created|processed|confirmed|completed|checked|extended|booked|sent|generated)\b/;

type ModuleEvent = { moduleId: string; timestamp: string; isAction: boolean };

function buildModuleUsage(facilityId: number): Record<string, ModuleUsage> {
  const now = new Date();
  const events: ModuleEvent[] = [];

  for (const log of getTenantActivityLogs(facilityId)) {
    const moduleId = moduleForActivityType(log.actionType);
    if (!moduleId) continue;
    events.push({
      moduleId,
      timestamp: log.timestamp,
      isAction: TRANSACTION_VERB.test(log.action.toLowerCase()),
    });
  }
  for (const log of getTenantAuditLogs(facilityId)) {
    const moduleId = moduleForAuditCategory(log.category);
    if (!moduleId) continue;
    events.push({
      moduleId,
      timestamp: log.timestamp,
      isAction: TRANSACTION_VERB.test(log.action.toLowerCase()),
    });
  }

  const out: Record<string, ModuleUsage> = {};
  for (const mod of availableModules) {
    const mine = events.filter((e) => e.moduleId === mod.id);
    const thisMonth = mine.filter((e) => sameMonth(e.timestamp, now));
    const accesses = thisMonth.length;
    const actions = thisMonth.filter((e) => e.isAction).length;
    const latest = mine.reduce<string | null>(
      (acc, e) => (acc && acc > e.timestamp ? acc : e.timestamp),
      null,
    );
    out[mod.id] = {
      usage: `${accesses} ${accesses === 1 ? "access" : "accesses"}`,
      actions,
      lastUsed: latest ? relativeTime(latest) : "—",
    };
  }
  return out;
}

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
    id: "data",
    name: "Data",
    icon: Database,
  },
  {
    id: "agreements",
    name: "Agreements",
    icon: FileSignature,
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
  const searchParams = useSearchParams();
  const facility = facilities.find((f) => f.id === Number(params.id));

  if (!facility) {
    notFound();
  }

  // Allow deep-linking to a specific tab, e.g. ?tab=billing from the
  // commercial Subscriptions table.
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "overview",
  );
  const [currentStatus, setCurrentStatus] = useState(facility.status);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    newStatus: "active" | "inactive" | "suspended" | "archived";
  } | null>(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>(
    facility.enabledModules || [],
  );
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    () => {
      const prefix = `${facility.id}-`;
      const seeded: Record<string, number> = {};
      for (const [key, price] of Object.entries(moduleQuotedPrices)) {
        if (key.startsWith(prefix)) seeded[key.slice(prefix.length)] = price;
      }
      return seeded;
    },
  );

  const moduleUsageData = useMemo(
    () => buildModuleUsage(facility.id),
    [facility.id],
  );

  const services = facility.locationsList.flatMap((l) => l.services);
  const uniqueServices = [...new Set(services)];

  // Get the price for a module (custom override or base price)
  const getModulePrice = (moduleId: string) => {
    const mod = availableModules.find((m) => m.id === moduleId);
    if (!mod) return 0;
    return priceOverrides[moduleId] ?? mod.basePrice;
  };

  // Check if module has a custom price override
  const hasCustomPrice = (moduleId: string) => moduleId in priceOverrides;

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
    const token = createImpersonationToken({
      facilityId: facility.id,
      facilityName: facility.name,
      primaryAdminEmail: facility.owner?.email ?? facility.contact?.email ?? "",
      adminName: IMPERSONATING_ADMIN.name,
    });
    // Open the facility's own dashboard in a NEW tab with the temporary token.
    window.open(
      `/facility/dashboard?impersonate=${encodeURIComponent(token)}`,
      "_blank",
      "noopener",
    );
    setShowImpersonateDialog(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            facility={facility}
            status={currentStatus}
            recentActivities={recentActivities}
            onNavigate={setActiveTab}
            onMarkActive={() => handleStatusChange("active")}
            onNavigateToReports={() => setActiveTab("reports")}
            onNavigateToModules={() => setActiveTab("modules")}
            onNavigateToLogs={() => setActiveTab("logs")}
          />
        );

      case "locations":
        return (
          <LocationsTab
            facilityId={facility.id}
            facilityName={facility.name}
            facilityPhone={facility.contact?.phone ?? ""}
            locations={facility.locationsList}
          />
        );

      case "clients":
        return (
          <ClientsTab
            facilityName={facility.name}
            facilityId={facility.id}
            facilityClients={facility.clients}
          />
        );

      case "staff":
        return (
          <StaffTab
            facilityId={facility.id}
            facilityName={facility.name}
            facilityUsersList={facility.usersList}
          />
        );

      case "billing":
        return <BillingTab facility={facility} />;

      case "data":
        return <DataExportTab facility={facility} />;

      case "agreements":
        return (
          <AgreementsTab
            facilityId={facility.id}
            facilityName={facility.name}
            ownerName={facility.owner?.name ?? "Facility Owner"}
            contactEmail={
              facility.contact?.email ?? facility.owner?.email ?? ""
            }
          />
        );

      case "modules":
        return (
          <ModulesTab
            facilityId={facility.id}
            facilityName={facility.name}
            enabledModules={enabledModules}
            priceOverrides={priceOverrides}
            moduleUsageData={moduleUsageData}
            getModulePrice={getModulePrice}
            hasCustomPrice={hasCustomPrice}
            onSave={(config) => {
              setEnabledModules(config.enabledModules);
              setPriceOverrides(config.priceOverrides);
            }}
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
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/facilities")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Building className="size-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">
                  {facility.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge type="status" value={currentStatus} showIcon />
                  <StatusBadge type="plan" value={facility.plan} showIcon />
                  {uniqueServices.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:ml-2">
                      {uniqueServices.slice(0, 3).map((service) => {
                        const Icon = getServiceIcon(service);
                        return (
                          <Badge
                            key={service}
                            variant="secondary"
                            className="px-2 py-0.5 text-xs capitalize"
                          >
                            <Icon className="mr-1 size-3" />
                            {service}
                          </Badge>
                        );
                      })}
                      {uniqueServices.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0.5 text-xs"
                        >
                          +{uniqueServices.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImpersonateDialog(true)}
              >
                <LogIn className="mr-2 size-4" />
                Impersonate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/facilities/new`)}
                  >
                    <Settings className="mr-2 size-4" />
                    Edit Facility
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <Key className="mr-2 size-4" />
                    Manage Permissions
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Status Management</DropdownMenuLabel>

                  {currentStatus !== "active" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("active")}
                    >
                      <Power className="text-success mr-2 size-4" />
                      <span className="text-success">Activate</span>
                    </DropdownMenuItem>
                  )}

                  {currentStatus === "active" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("inactive")}
                    >
                      <Power className="text-muted-foreground mr-2 size-4" />
                      Deactivate
                    </DropdownMenuItem>
                  )}

                  {currentStatus !== "suspended" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("suspended")}
                    >
                      <Pause className="text-warning mr-2 size-4" />
                      <span className="text-warning">Suspend</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => handleStatusChange("archived")}
                    className="text-destructive"
                  >
                    <Archive className="mr-2 size-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors`,
                  "hover:bg-muted/50",
                  isActive
                    ? "border-primary bg-background text-primary border-b-2"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Suspension flag (Day-14 dunning) */}
      <FacilitySuspensionBanner
        facilityId={facility.id}
        status={currentStatus}
        onSuspend={() => handleStatusChange("suspended")}
      />

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
              You are about to open <strong>{facility.name}</strong>&apos;s
              dashboard in a new tab as their admin. Every action is logged in
              the audit trail, and the facility&apos;s primary admin is notified
              by email.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted space-y-2 rounded-lg p-4">
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
              <LogIn className="mr-2 size-4" />
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
            <div className="bg-muted space-y-2 rounded-lg p-4">
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
              <p className="text-destructive mt-3 flex items-center gap-2 text-sm">
                <AlertCircle className="size-4" />
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
