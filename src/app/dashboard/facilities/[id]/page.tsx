"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  facilities,
  availableModules,
  planPrices,
  moduleQuotedPrices,
} from "@/data/facilities";
import { plans } from "@/data/plans";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FacilityReports } from "@/components/facility/FacilityReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building,
  Building2,
  Users,
  UserCheck,
  MapPin,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  Globe,
  User,
  TrendingUp,
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
  DollarSign,
  Activity,
  FileText,
  Download,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Package,
  MessageSquare,
  GraduationCap,
  Puzzle,
  Edit,
  PawPrint,
} from "lucide-react";
import { notFound } from "next/navigation";

// Mock data
const revenueData = [
  { month: "Jan", revenue: 4500 },
  { month: "Feb", revenue: 5200 },
  { month: "Mar", revenue: 4800 },
  { month: "Apr", revenue: 6100 },
  { month: "May", revenue: 5500 },
  { month: "Jun", revenue: 6700 },
];

const billingHistory = [
  {
    id: 1,
    date: "2025-01-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "INV-2025-001",
  },
  {
    id: 2,
    date: "2024-12-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "INV-2024-012",
  },
  {
    id: 3,
    date: "2024-11-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "INV-2024-011",
  },
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
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${
                    trend.isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 mr-0.5 ${!trend.isPositive && "rotate-180"}`}
                  />
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FacilityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const facility = facilities.find((f) => f.id === Number(params.id));

  if (!facility) {
    notFound();
  }

  const [currentStatus, setCurrentStatus] = useState(facility.status);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    newStatus: "active" | "inactive" | "suspended" | "archived";
  } | null>(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[]>(
    facility.enabledModules || [],
  );
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [editableLimits, setEditableLimits] = useState({
    locations: facility.limits?.locations ?? 0,
    staff: facility.limits?.staff ?? 0,
    clients: facility.limits?.clients ?? 0,
    pets: facility.limits?.pets ?? 0,
  });
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editableContact, setEditableContact] = useState({
    email: facility.contact?.email ?? "",
    phone: facility.contact?.phone ?? "",
    website: facility.contact?.website ?? "",
  });
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(facility.plan);

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

  // Calculate total monthly subscription cost
  const basePlanCost = planPrices[facility.plan] ?? 0;
  const modulesCost = enabledModules.reduce(
    (sum, moduleId) => sum + getModulePrice(moduleId),
    0,
  );
  const monthlySubscriptionCost = basePlanCost + modulesCost;

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

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case "Calendar":
        return Calendar;
      case "Users":
        return Users;
      case "UserCheck":
        return UserCheck;
      case "CreditCard":
        return CreditCard;
      case "MessageSquare":
        return MessageSquare;
      case "GraduationCap":
        return GraduationCap;
      case "Scissors":
        return Scissors;
      case "Package":
        return Package;
      default:
        return Puzzle;
    }
  };

  const toggleModule = (moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "booking":
        return Calendar;
      case "payment":
        return DollarSign;
      case "user":
        return Users;
      case "client":
        return UserCheck;
      default:
        return Activity;
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

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/facilities")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              }}
            >
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{facility.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge type="status" value={currentStatus} showIcon />
                <StatusBadge type="plan" value={facility.plan} showIcon />
              </div>
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
                <DropdownMenuItem onClick={() => handleStatusChange("active")}>
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

      {/* Services */}
      {uniqueServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueServices.map((service) => {
            const Icon = getServiceIcon(service);
            return (
              <Badge
                key={service}
                variant="secondary"
                className="capitalize py-1.5 px-3"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {service}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}K`}
          subtitle="Last 6 months"
          icon={DollarSign}
          iconBgStyle={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          }}
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard
          title="Staff Members"
          value={facility.usersList.length}
          subtitle="Active users"
          icon={Users}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
        />
        <StatCard
          title="Active Clients"
          value={activeClients}
          subtitle={`of ${facility.clients.length} total`}
          icon={UserCheck}
          iconBgStyle={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          }}
          trend={{ value: "+8%", isPositive: true }}
        />
        <StatCard
          title="Locations"
          value={facility.locationsList.length}
          subtitle="Active branches"
          icon={MapPin}
          iconBgStyle={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          }}
        />
      </div>

      {/* Facility Reports Section */}
      <FacilityReports facilityId={facility.id} facilityName={facility.name} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Section */}
          <Card className="border-0 shadow-card">
            <Tabs defaultValue="locations" className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-3 h-auto bg-muted/50">
                  <TabsTrigger
                    value="locations"
                    className="gap-2 data-[state=active]:shadow-sm"
                  >
                    <MapPin className="h-4 w-4" />
                    Locations
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {facility.locationsList.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="clients"
                    className="gap-2 data-[state=active]:shadow-sm"
                  >
                    <UserCheck className="h-4 w-4" />
                    Clients
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {facility.clients.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="staff"
                    className="gap-2 data-[state=active]:shadow-sm"
                  >
                    <Users className="h-4 w-4" />
                    Staff
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {facility.usersList.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="locations" className="mt-0">
                  <div className="space-y-3">
                    {facility.locationsList.map((location, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-xl"
                          style={{
                            background:
                              "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                          }}
                        >
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{location.name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {location.address}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {location.services.map((service: string) => (
                              <Badge
                                key={service}
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="clients" className="mt-0">
                  <div className="space-y-3">
                    {facility.clients.map((client, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-semibold text-sm text-primary">
                            {client.person.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {client.person.name}
                            </h4>
                            <div className="flex items-center gap-4 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.person.email}
                              </span>
                              {client.person.phone && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.person.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            client.status === "active" ? "default" : "secondary"
                          }
                          className={
                            client.status === "active"
                              ? "bg-success text-success-foreground"
                              : ""
                          }
                        >
                          {client.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="staff" className="mt-0">
                  <div className="space-y-3">
                    {facility.usersList.map((user, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm text-white"
                            style={{
                              background:
                                user.role === "Admin"
                                  ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                                  : user.role === "Manager"
                                    ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                                    : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                            }}
                          >
                            {user.person.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {user.person.name}
                            </h4>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.person.email}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            user.role === "Admin" ? "default" : "secondary"
                          }
                          className={
                            user.role === "Admin"
                              ? "bg-primary"
                              : user.role === "Manager"
                                ? "bg-info text-info-foreground"
                                : ""
                          }
                        >
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Billing & Subscription */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscription Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <div className="mt-1">
                    <StatusBadge type="plan" value={facility.plan} />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-semibold mt-1">{facility.dayJoined}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Next Billing</p>
                  <p className="font-semibold mt-1">
                    {facility.subscriptionEnd || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                  <p className="font-bold text-lg mt-1">
                    ${monthlySubscriptionCost.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Base: ${planPrices[facility.plan]?.toFixed(2) ?? "0.00"} +
                    Modules
                  </p>
                </div>
              </div>

              {/* Plan Limits */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Plan Limits</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditableLimits({
                        locations: facility.limits?.locations ?? 0,
                        staff: facility.limits?.staff ?? 0,
                        clients: facility.limits?.clients ?? 0,
                        pets: facility.limits?.pets ?? 0,
                      });
                      setShowLimitsDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Limits
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Building2 className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {facility.limits?.locations === -1
                        ? "∞"
                        : (facility.limits?.locations ?? "N/A")}
                    </p>
                    <p className="text-xs text-muted-foreground">Locations</p>
                    <p className="text-[10px] text-primary mt-1">
                      {facility.locationsList.length} used
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {facility.limits?.staff === -1
                        ? "∞"
                        : (facility.limits?.staff ?? "N/A")}
                    </p>
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="text-[10px] text-primary mt-1">
                      {facility.usersList.length} used
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <UserCheck className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {facility.limits?.clients === -1
                        ? "∞"
                        : (facility.limits?.clients ?? "N/A")}
                    </p>
                    <p className="text-xs text-muted-foreground">Clients</p>
                    <p className="text-[10px] text-primary mt-1">
                      {facility.clients.length} used
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <PawPrint className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {facility.limits?.pets === -1
                        ? "∞"
                        : (facility.limits?.pets ?? "N/A")}
                    </p>
                    <p className="text-xs text-muted-foreground">Pets</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Per plan
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Billing History</h4>
                <div className="space-y-3">
                  {billingHistory.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <h4 className="font-medium">{bill.description}</h4>
                          <p className="text-xs text-muted-foreground">
                            {bill.date} • {bill.invoice}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${bill.amount.toFixed(2)}
                        </p>
                        <Badge
                          variant="secondary"
                          className="bg-success/10 text-success"
                        >
                          Paid
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setShowSubscriptionDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </CardContent>
          </Card>

          {/* Enabled Modules */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Enabled Modules
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModulesDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Manage Modules
              </Button>
            </CardHeader>
            <CardContent>
              {enabledModules.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableModules
                    .filter((m) => enabledModules.includes(m.id))
                    .map((module) => {
                      const Icon = getModuleIcon(module.icon);
                      const usage = moduleUsageData[module.id];
                      return (
                        <div
                          key={module.id}
                          className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex items-center justify-center w-10 h-10 rounded-xl"
                              style={{
                                background:
                                  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                              }}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">
                                  {module.name}
                                </h4>
                                <span className="text-xs font-semibold text-primary">
                                  ${getModulePrice(module.id).toFixed(2)}/mo
                                </span>
                                {hasCustomPrice(module.id) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {module.description}
                              </p>
                            </div>
                          </div>
                          {usage && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Usage
                                </p>
                                <p className="text-sm font-semibold">
                                  {usage.usage.split(" ")[0]}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {usage.usage.split(" ").slice(1).join(" ")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Actions
                                </p>
                                <p className="text-sm font-semibold">
                                  {usage.actions}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  this month
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Last Used
                                </p>
                                <p className="text-sm font-semibold">
                                  {usage.lastUsed.split(" ")[0]}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {usage.lastUsed.split(" ").slice(1).join(" ")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No modules enabled</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowModulesDialog(true)}
                  >
                    Enable Modules
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditableContact({
                    email: facility.contact?.email ?? "",
                    phone: facility.contact?.phone ?? "",
                    website: facility.contact?.website ?? "",
                  });
                  setShowContactDialog(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">
                    {facility.contact?.email || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                  <Phone className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">
                    {facility.contact?.phone || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10">
                  <Globe className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="text-sm font-medium">
                    {facility.contact?.website || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner / Admin Information */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Owner / Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  }}
                >
                  {facility.owner?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium">
                    {facility.owner?.name || "Not provided"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Facility Owner
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">
                    {facility.owner?.email || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                  <Phone className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">
                    {facility.owner?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full mt-4">
                View All Activity
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Key className="h-4 w-4 mr-2" />
                Reset Admin Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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

      {/* Modules Edit Dialog */}
      <Dialog open={showModulesDialog} onOpenChange={setShowModulesDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Facility Modules</DialogTitle>
            <DialogDescription>
              Enable or disable modules for {facility.name}. Changes will
              immediately affect which features are available to this facility.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="grid gap-3">
              {availableModules.map((module) => {
                const Icon = getModuleIcon(module.icon);
                const isEnabled = enabledModules.includes(module.id);
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      isEnabled
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                          isEnabled ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isEnabled ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.name}</h4>
                          <span
                            className={`text-xs font-semibold ${isEnabled ? "text-primary" : "text-muted-foreground"}`}
                          >
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Quoted
                            </Badge>
                          )}
                          {!hasCustomPrice(module.id) && (
                            <span className="text-[10px] text-muted-foreground">
                              (Base price)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex flex-col gap-1 mr-auto text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                {enabledModules.length} of {availableModules.length} modules
                enabled
              </div>
              <div className="text-muted-foreground">
                Modules cost:{" "}
                <span className="font-semibold text-foreground">
                  $
                  {enabledModules
                    .reduce((sum, id) => sum + getModulePrice(id), 0)
                    .toFixed(2)}
                  /mo
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowModulesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowModulesDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
            <DialogDescription>
              Update the contact details for {facility.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="contact-email"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={editableContact.email}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="contact-phone"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={editableContact.phone}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="contact-website"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="contact-website"
                type="url"
                placeholder="https://example.com"
                value={editableContact.website}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowContactDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Subscription Dialog */}
      <Dialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {facility.name}. Current plan:{" "}
              <span className="font-semibold">{facility.plan}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="grid gap-3">
              {plans.map((plan) => {
                const isCurrentPlan =
                  facility.plan.toLowerCase() === plan.name.toLowerCase();
                const isSelected =
                  selectedPlan.toLowerCase() === plan.name.toLowerCase();
                const formatLimit = (value: number) =>
                  value === -1 ? "Unlimited" : value.toString();
                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                            isSelected ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <CreditCard
                            className={`h-5 w-5 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{plan.name}</h4>
                            {isCurrentPlan && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          ${plan.pricing[0]?.basePrice ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>
                          {formatLimit(plan.limits.locations)} locations
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits?.staff)} staff</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits?.clients)} clients</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PawPrint className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits.pets)} pets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPlan.toLowerCase() !== facility.plan.toLowerCase() && (
              <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Plan Change Notice</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing from <strong>{facility.plan}</strong> to{" "}
                      <strong>{selectedPlan}</strong> will take effect
                      immediately. The billing will be prorated for the
                      remainder of the current billing cycle.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center gap-2 mr-auto text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Next billing: {facility.subscriptionEnd || "N/A"}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPlan(facility.plan);
                setShowSubscriptionDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowSubscriptionDialog(false)}
              disabled={
                selectedPlan.toLowerCase() === facility.plan.toLowerCase()
              }
            >
              {selectedPlan.toLowerCase() === facility.plan.toLowerCase()
                ? "No Changes"
                : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limits Dialog */}
      <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Facility Limits</DialogTitle>
            <DialogDescription>
              Adjust the limits for {facility.name}. Use -1 for unlimited.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="limit-locations"
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Locations
                </Label>
                <Input
                  id="limit-locations"
                  type="number"
                  min="-1"
                  value={editableLimits.locations}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      locations: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.locationsList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-staff"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Staff
                </Label>
                <Input
                  id="limit-staff"
                  type="number"
                  min="-1"
                  value={editableLimits.staff}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      staff: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.usersList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-clients"
                  className="flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Clients
                </Label>
                <Input
                  id="limit-clients"
                  type="number"
                  min="-1"
                  value={editableLimits.clients}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      clients: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.clients.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-pets" className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4" />
                  Pets
                </Label>
                <Input
                  id="limit-pets"
                  type="number"
                  min="-1"
                  value={editableLimits.pets}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      pets: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Note:</strong> Enter -1 for unlimited. Changes will apply
              immediately to this facility&apos;s subscription.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLimitsDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowLimitsDialog(false)}>
              Save Changes
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
