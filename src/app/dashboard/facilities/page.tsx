"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { facilities as initialFacilities } from "@/data/facilities";
import { facilityRequests } from "@/data/facility-requests";
import { getCurrentSubscription } from "@/data/facility-billing";
import { users } from "@/data/users";
import { facilityStaff } from "@/data/facility-staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  Plus,
  Download,
  Mail,
  Building,
  CreditCard,
  Shield,
  Users,
  UserCheck,
  MapPin,
  Calendar,
  Clock,
  Eye,
  TrendingUp,
  Activity,
  AlertCircle,
  Send,
  CheckCircle,
  DollarSign,
  LogIn,
  Search,
} from "lucide-react";

// Per-facility monthly recurring revenue, from real subscription records.
// Returns null when the facility has no subscription record at all (vs. 0 for a
// trial / $0 plan, which is a real value worth showing).
function getFacilityMrr(facilityId: number): number | null {
  return getCurrentSubscription(facilityId)?.monthlyEquivalent ?? null;
}

// Most recent login by any staff member. Staff users (src/data/users.ts) link
// to a facility by name; facility 11's multi-location staff live in
// facility-staff.ts (keyed by location, so it only applies to that facility).
function getFacilityLastLogin(
  facilityName: string,
  facilityId: number,
): string | null {
  const timestamps: string[] = users
    .filter((u) => u.facility === facilityName)
    .map((u) => u.lastLogin);
  if (facilityId === 11) {
    timestamps.push(...facilityStaff.map((s) => s.lastActive));
  }
  const valid = timestamps.filter(Boolean);
  if (valid.length === 0) return null;
  return valid.reduce((latest, t) =>
    new Date(t).getTime() > new Date(latest).getTime() ? t : latest,
  );
}

const exportToCSV = (facilities: typeof initialFacilities) => {
  const headers = [
    "ID",
    "Name",
    "Status",
    "Plan",
    "Day Joined",
    "Subscription End",
    "Primary Address",
    "Total Users",
    "Active Clients",
    "Locations Count",
    "Services",
  ];

  const csvContent = [
    headers.join(","),
    ...facilities.map((facility) =>
      [
        facility.id,
        `"${facility.name.replace(/"/g, '""')}"`,
        facility.status,
        facility.plan,
        facility.dayJoined,
        facility.subscriptionEnd || "",
        `"${facility.locationsList[0]?.address?.replace(/"/g, '""') || ""}"`,
        facility.usersList.length,
        facility.clients.filter((c) => c.status === "active").length,
        facility.locationsList.length,
        `"${facility.locationsList[0]?.services?.join("; ") || ""}"`,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `facilities_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Stat card component matching dashboard theme
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgStyle,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBgStyle: React.CSSProperties;
  trend?: { value: string; isPositive: boolean };
}) {
  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${trend.isPositive ? "text-success" : "text-destructive"} `}
                >
                  <TrendingUp
                    className={`mr-0.5 size-3 ${!trend.isPositive && `rotate-180`} `}
                  />
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
            )}
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="size-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lazy-loaded — the wizard chunk only loads when "+ Add Facility" is clicked.
const FacilityOnboardingWizard = dynamic(
  () =>
    import("@/components/admin/facility-onboarding-wizard").then(
      (m) => m.FacilityOnboardingWizard,
    ),
  { ssr: false },
);

type FacilityFilters = {
  statuses: string[];
  plans: string[];
  businessTypes: string[];
};
const EMPTY_FILTERS: FacilityFilters = {
  statuses: [],
  plans: [],
  businessTypes: [],
};

// One multi-select group in the filter panel.
function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="space-y-1">
        {options.map((opt) => (
          <Label
            key={opt}
            className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm font-normal capitalize"
          >
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={() => onToggle(opt)}
            />
            {opt}
          </Label>
        ))}
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const router = useRouter();
  const [facilitiesState] = useState(initialFacilities);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notificationSent, setNotificationSent] = useState(false);

  // Search + multi-select filter panel. Both run at the page level so the
  // Export CSV reflects exactly the filtered view the user sees.
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<FacilityFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<FacilityFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const filterOptions = useMemo(() => {
    const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
    return {
      statuses: uniq(facilitiesState.map((f) => f.status)),
      plans: uniq(facilitiesState.map((f) => f.plan)),
      businessTypes: uniq(
        facilitiesState.flatMap((f) =>
          f.locationsList.flatMap((l) => l.services),
        ),
      ),
    };
  }, [facilitiesState]);

  const visibleFacilities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return facilitiesState.filter((f) => {
      if (q) {
        const haystack =
          `${f.name} ${f.owner.name} ${f.contact.email} ${f.locationsList.map((l) => l.address).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (
        appliedFilters.statuses.length > 0 &&
        !appliedFilters.statuses.includes(f.status)
      )
        return false;
      if (
        appliedFilters.plans.length > 0 &&
        !appliedFilters.plans.includes(f.plan)
      )
        return false;
      if (appliedFilters.businessTypes.length > 0) {
        const services = f.locationsList.flatMap((l) => l.services);
        if (!appliedFilters.businessTypes.some((b) => services.includes(b)))
          return false;
      }
      return true;
    });
  }, [facilitiesState, searchTerm, appliedFilters]);

  const activeFilterCount =
    appliedFilters.statuses.length +
    appliedFilters.plans.length +
    appliedFilters.businessTypes.length;

  const toggleDraftFilter = (group: keyof FacilityFilters, value: string) => {
    setDraftFilters((prev) => {
      const set = new Set(prev[group]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [group]: Array.from(set) };
    });
  };

  const openFilterPanel = () => {
    setDraftFilters(appliedFilters);
    setFilterOpen(true);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleSendNotification = () => {
    // Simulate sending notification
    setNotificationSent(true);
    setTimeout(() => {
      setNotificationSent(false);
      setIsNotifyModalOpen(false);
      setNotifySubject("");
      setNotifyMessage("");
    }, 2000);
  };

  const pendingRequestsCount = facilityRequests.filter(
    (r) => r.status === "pending",
  ).length;

  // Calculate stats
  const stats = useMemo(() => {
    const active = facilitiesState.filter((f) => f.status === "active").length;
    const totalUsers = facilitiesState.reduce(
      (sum, f) => sum + f.usersList.length,
      0,
    );
    const totalClients = facilitiesState.reduce(
      (sum, f) => sum + f.clients.filter((c) => c.status === "active").length,
      0,
    );
    const premiumCount = facilitiesState.filter(
      (f) => f.plan === "Premium" || f.plan === "Enterprise",
    ).length;

    return {
      total: facilitiesState.length,
      active,
      inactive: facilitiesState.length - active,
      totalUsers,
      totalClients,
      premiumCount,
      avgUsers: Math.round(totalUsers / facilitiesState.length),
    };
  }, [facilitiesState]);

  const columns: ColumnDef<(typeof initialFacilities)[0]>[] = [
    {
      key: "name",
      label: "Facility Name",
      icon: Building,
      defaultVisible: true,
      render: (facility) => (
        <div className="flex flex-col">
          <span className="font-medium">{facility.name}</span>
          <span className="text-muted-foreground text-xs">
            {facility.locationsList[0]?.address || "No address"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: Shield,
      defaultVisible: true,
      render: (facility) => (
        <StatusBadge type="status" value={facility.status} />
      ),
    },
    {
      key: "plan",
      label: "Plan",
      icon: CreditCard,
      defaultVisible: true,
      render: (facility) => <StatusBadge type="plan" value={facility.plan} />,
    },
    {
      key: "businessType",
      label: "Business Type",
      icon: Activity,
      defaultVisible: true,
      render: (facility) => {
        const services = facility.locationsList[0]?.services || [];
        return (
          <div className="flex flex-wrap gap-1">
            {services.slice(0, 2).map((service) => (
              <Badge key={service} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
            {services.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{services.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      sortValue: (facility) =>
        facility.locationsList[0]?.services?.join(", ") ?? "",
    },
    {
      key: "users",
      label: "Total Users",
      icon: Users,
      defaultVisible: true,
      render: (facility) => facility.usersList.length,
      sortValue: (facility) => facility.usersList.length,
    },
    {
      key: "activeClients",
      label: "Active Clients",
      icon: UserCheck,
      defaultVisible: true,
      render: (facility) =>
        facility.clients.filter((c) => c.status === "active").length,
      sortValue: (facility) =>
        facility.clients.filter((c) => c.status === "active").length,
    },
    {
      key: "mrr",
      label: "MRR",
      icon: DollarSign,
      defaultVisible: true,
      render: (facility) => {
        const mrr = getFacilityMrr(facility.id);
        return mrr === null ? "—" : `$${mrr.toLocaleString()}`;
      },
      sortValue: (facility) => getFacilityMrr(facility.id) ?? -1,
    },
    {
      key: "lastLogin",
      label: "Last Login",
      icon: LogIn,
      defaultVisible: true,
      render: (facility) => {
        const ts = getFacilityLastLogin(facility.name, facility.id);
        return ts
          ? new Date(ts).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";
      },
      sortValue: (facility) => {
        const ts = getFacilityLastLogin(facility.name, facility.id);
        return ts ? new Date(ts).getTime() : 0;
      },
    },
    {
      key: "locations",
      label: "Locations",
      icon: MapPin,
      defaultVisible: false,
      render: (facility) => facility.locationsList.length,
      sortValue: (facility) => facility.locationsList.length,
    },
    {
      key: "dayJoined",
      label: "Day Joined",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "subscriptionEnd",
      label: "Subscription End",
      icon: Clock,
      defaultVisible: false,
      render: (facility) => facility.subscriptionEnd || "N/A",
      sortValue: (facility) => facility.subscriptionEnd || "",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {"Facilities Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all facility operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(visibleFacilities)}
          >
            <Download className="mr-2 size-4" />
            {"Export CSV"}
          </Button>
          <Button variant="outline" onClick={() => setIsNotifyModalOpen(true)}>
            <Mail className="mr-2 size-4" />
            {"Notify All"}
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 size-4" />
            {"Add Facility"}
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={"Total Facilities"}
          value={stats.total}
          subtitle={`${stats.active} ${"Active".toLowerCase()}, ${stats.inactive} inactive`}
          icon={Building}
          iconBgStyle={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          }}
        />
        <StatCard
          title={"Total Users"}
          value={stats.totalUsers}
          subtitle={"Across all facilities"}
          icon={Users}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
        />
        <StatCard
          title="Active Clients"
          value={stats.totalClients}
          subtitle="Total across facilities"
          icon={UserCheck}
          iconBgStyle={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          }}
        />
        <StatCard
          title="Premium & Enterprise"
          value={stats.premiumCount}
          subtitle={`${Math.round((stats.premiumCount / stats.total) * 100)}% of total facilities`}
          icon={CreditCard}
          iconBgStyle={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          }}
        />
      </div>

      {/* Pending Requests Alert */}
      {pendingRequestsCount > 0 && (
        <Card className="border-l-warning bg-warning/5 shadow-card border-0 border-l-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-warning/10 flex size-10 items-center justify-center rounded-xl">
                  <AlertCircle className="text-warning size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {pendingRequestsCount} Pending Facility Requests
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    New facilities awaiting approval
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/facilities/requests")}
              >
                <Eye className="mr-2 size-4" />
                {"View Requests"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facilities Table */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">
              All Facilities
            </CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                placeholder="Search by name, city, or email..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search facilities"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={visibleFacilities}
            columns={columns}
            onFilterClick={openFilterPanel}
            filterCount={activeFilterCount}
            itemsPerPage={10}
            onRowClick={(facility) =>
              router.push(`/dashboard/facilities/${facility.id}`)
            }
          />
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filter facilities</SheetTitle>
            <SheetDescription>
              Refine the list by status, plan, and business type.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-4">
            <FilterGroup
              title="Status"
              options={filterOptions.statuses}
              selected={draftFilters.statuses}
              onToggle={(v) => toggleDraftFilter("statuses", v)}
            />
            <FilterGroup
              title="Plan"
              options={filterOptions.plans}
              selected={draftFilters.plans}
              onToggle={(v) => toggleDraftFilter("plans", v)}
            />
            <FilterGroup
              title="Business Type"
              options={filterOptions.businessTypes}
              selected={draftFilters.businessTypes}
              onToggle={(v) => toggleDraftFilter("businessTypes", v)}
            />
          </div>
          <SheetFooter className="flex-row gap-2 border-t">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Clear
            </Button>
            <Button className="flex-1" onClick={applyFilters}>
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Notify All Modal */}
      <Dialog open={isNotifyModalOpen} onOpenChange={setIsNotifyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              {"Notify All"}
            </DialogTitle>
            <DialogDescription>
              Send a notification to all {facilitiesState.length} facilities
            </DialogDescription>
          </DialogHeader>
          {notificationSent ? (
            <div className="flex flex-col items-center py-8">
              <div className="bg-success/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <CheckCircle className="text-success size-8" />
              </div>
              <h3 className="text-lg font-semibold">Notification Sent!</h3>
              <p className="text-muted-foreground text-sm">
                All facilities have been notified
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter notification subject"
                    value={notifySubject}
                    onChange={(e) => setNotifySubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message to all facilities..."
                    rows={5}
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNotifyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendNotification}
                  disabled={!notifySubject || !notifyMessage}
                >
                  <Send className="mr-2 size-4" />
                  Send Notification
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {wizardOpen && (
        <FacilityOnboardingWizard onClose={() => setWizardOpen(false)} />
      )}
    </div>
  );
}
