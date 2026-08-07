"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminFacilityRow } from "@/types/admin-facility";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  createImpersonationToken,
  IMPERSONATING_ADMIN,
} from "@/lib/impersonation";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  Key,
  AlertCircle,
  Puzzle,
  Shield,
  LayoutDashboard,
  Database,
  FileSignature,
  Loader2,
} from "lucide-react";
import { notFound } from "next/navigation";

import { NotYetReal } from "./_components/not-yet-real";
import { FacilityOverview } from "./_components/facility-overview";

// Real per-facility module usage, derived from the facility's activity log
// (activity + audit trail) filtered by module. Every module in availableModules
// gets an entry — modules with genuine zero activity report "0" / "—" so the
// Modules tab never shows an indefinite loading skeleton.
// Map a raw log entry to the module short-id it belongs to (null = not a
// module-scoped event, e.g. security/system/config noise).
// A discrete "action" is a created booking / processed transaction, as opposed
// to a passive access (view/update). Detected from the action verb.
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

function FacilityDetail({ facility }: { facility: AdminFacilityRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Allow deep-linking to a specific tab, e.g. ?tab=billing from the
  // commercial Subscriptions table.
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "overview",
  );
  // Widened to the four the menu offers. `facility.status` is the badge-level
  // active/inactive derived from the SUBSCRIPTION; suspending is a real action
  // against it (see confirmStatusChange).
  const [currentStatus, setCurrentStatus] = useState<
    "active" | "inactive" | "suspended" | "archived"
  >(facility.status);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    newStatus: "active" | "inactive" | "suspended" | "archived";
  } | null>(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);

  const services = facility.locationsList.flatMap(
    (location) => location.services,
  );
  const uniqueServices = [...new Set(services)];

  // Get the price for a module (custom override or base price)

  // Check if module has a custom price override

  const handleStatusChange = (
    newStatus: "active" | "inactive" | "suspended" | "archived",
  ) => {
    setStatusChangeModal({ newStatus });
  };

  // The menu used to call setCurrentStatus and stop there: the badge changed,
  // nothing else did, and a refresh undid it. Same shape as the Add Facility
  // toast that claimed to have created a facility.
  //
  // "archived" has no subscription equivalent, so it is treated as cancelled —
  // the nearest true thing rather than a fifth state nothing enforces.
  const changeStatus = useMutation({
    mutationFn: async (
      next: "active" | "inactive" | "suspended" | "archived",
    ) => {
      const status =
        next === "active"
          ? "active"
          : next === "archived"
            ? "cancelled"
            : "suspended";
      const response = await fetch(`/api/facilities/${facility.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error ?? "Could not change it.");
      return next;
    },
    onSuccess: (next) => {
      setCurrentStatus(next);
      setStatusChangeModal(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "facility"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
    },
  });

  const confirmStatusChange = () => {
    if (!statusChangeModal) return;
    changeStatus.mutate(statusChangeModal.newStatus);
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
        return <FacilityOverview facility={facility} />;

      case "locations":
        return (
          <NotYetReal
            title="Locations"
            description="Adding, editing and configuring this facility's locations."
          />
        );

      case "clients":
        return (
          <NotYetReal
            title="Clients"
            description="This facility's client list, with contact details and history."
          />
        );

      case "staff":
        return (
          <NotYetReal
            title="Staff"
            description="The people who work at this facility."
          />
        );

      case "billing":
        return (
          <NotYetReal
            title="Billing"
            description="Invoices, payment method and plan changes for this facility."
          />
        );

      case "data":
        return (
          <NotYetReal
            title="Data export"
            description="A GDPR-shaped export of everything this facility holds."
          />
        );

      case "agreements":
        return (
          <NotYetReal
            title="Agreements"
            description="Signed agreements and signature requests for this facility."
          />
        );

      case "modules":
        return (
          <NotYetReal
            title="Modules"
            description="Which modules this facility has switched on, and any price overrides."
          />
        );

      case "reports":
        return (
          <NotYetReal
            title="Reports"
            description="Revenue, bookings and occupancy reports for this facility."
          />
        );

      case "logs":
        return (
          <NotYetReal
            title="Activity log"
            description="What has happened in this facility, and who did it."
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
                        return (
                          <Badge
                            key={service}
                            variant="secondary"
                            className="px-2 py-0.5 text-xs capitalize"
                          >
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

                  {false && (
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

// ============================================================================
// Resolving the facility.
//
// This page used to do:
//
//   const facility = facilities.find((f) => f.id === Number(params.id));
//   if (!facility) notFound();
//
// against the mock array. `Number(uuid)` is NaN, so every REAL facility 404'd —
// which is exactly what a superadmin got the moment the list started showing
// real facilities and they clicked a row.
//
// Split in two rather than making the component's hooks conditional: the
// original `notFound()` ran BEFORE a dozen useState calls, and moving a fetch
// above them without splitting would have made every one of those hooks
// conditional on the request having resolved.
// ============================================================================
export default function FacilityDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", id],
    queryFn: async (): Promise<AdminFacilityRow | null> => {
      const response = await fetch(`/api/facilities/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Could not load this facility.");
      return (await response.json()) as AdminFacilityRow;
    },
    enabled: id.length > 0,
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading facility…
      </div>
    );
  }

  // A real 404 and a failed request are different answers, and only the first
  // is a missing facility.
  if (isError) {
    return (
      <div className="text-destructive flex flex-1 items-center justify-center p-6 text-sm">
        Could not load this facility. Try again.
      </div>
    );
  }

  if (!data) notFound();

  return <FacilityDetail facility={data} />;
}
