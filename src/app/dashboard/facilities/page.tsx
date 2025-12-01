"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { facilities as initialFacilities } from "@/data/facilities";
import { facilityRequests } from "@/data/facility-requests";
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

import { FacilityModal } from "@/components/modals/FacilityModal";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
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
} from "lucide-react";

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

export default function FacilitiesPage() {
  const router = useRouter();
  const t = useTranslations("facilities");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const tPlans = useTranslations("plans");
  const [facilitiesState] = useState(initialFacilities);
  const [selectedFacility, setSelectedFacility] = useState<
    (typeof initialFacilities)[0] | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notificationSent, setNotificationSent] = useState(false);

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
      label: t("facilityName"),
      icon: Building,
      defaultVisible: true,
      render: (facility) => (
        <div className="flex flex-col">
          <span className="font-medium">{facility.name}</span>
          <span className="text-xs text-muted-foreground">
            {facility.locationsList[0]?.address || "No address"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: tCommon("status"),
      icon: Shield,
      defaultVisible: true,
      render: (facility) => (
        <StatusBadge type="status" value={facility.status} />
      ),
    },
    {
      key: "plan",
      label: tCommon("plan"),
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
    },
    {
      key: "users",
      label: t("totalUsers"),
      icon: Users,
      defaultVisible: true,
      render: (facility) => facility.usersList.length,
      sortValue: (facility) => facility.usersList.length,
    },
    {
      key: "activeClients",
      label: t("activeClients"),
      icon: UserCheck,
      defaultVisible: true,
      render: (facility) =>
        facility.clients.filter((c) => c.status === "active").length,
      sortValue: (facility) =>
        facility.clients.filter((c) => c.status === "active").length,
    },
    {
      key: "locations",
      label: t("locations"),
      icon: MapPin,
      defaultVisible: false,
      render: (facility) => facility.locationsList.length,
      sortValue: (facility) => facility.locationsList.length,
    },
    {
      key: "dayJoined",
      label: t("dayJoined"),
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "subscriptionEnd",
      label: t("subscriptionEnd"),
      icon: Clock,
      defaultVisible: false,
      render: (facility) => facility.subscriptionEnd || "N/A",
      sortValue: (facility) => facility.subscriptionEnd || "",
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: tCommon("status"),
      options: [
        { value: "all", label: tCommon("all") + " " + tCommon("status") },
        { value: "active", label: tStatus("active") },
        { value: "inactive", label: tStatus("inactive") },
      ],
    },
    {
      key: "plan",
      label: tCommon("plan"),
      options: [
        { value: "all", label: tCommon("all") + " " + tCommon("plans") },
        { value: "Free", label: tPlans("free") },
        { value: "Basic", label: tPlans("basic") },
        { value: "Premium", label: tPlans("premium") },
        { value: "Enterprise", label: tPlans("enterprise") },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all facility operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(facilitiesState)}
          >
            <Download className="mr-2 h-4 w-4" />
            {tCommon("export")}
          </Button>
          <Button variant="outline" onClick={() => setIsNotifyModalOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            {t("notifyAll")}
          </Button>
          <Button onClick={() => router.push("/dashboard/facilities/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addFacility")}
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalFacilities")}
          value={stats.total}
          subtitle={`${stats.active} ${tStatus("active").toLowerCase()}, ${stats.inactive} inactive`}
          icon={Building}
          iconBgStyle={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          }}
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard
          title={t("totalUsers")}
          value={stats.totalUsers}
          subtitle={t("acrossAllFacilities")}
          icon={Users}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
          trend={{ value: "+8%", isPositive: true }}
        />
        <StatCard
          title="Active Clients"
          value={stats.totalClients}
          subtitle="Total across facilities"
          icon={UserCheck}
          iconBgStyle={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          }}
          trend={{ value: "+15%", isPositive: true }}
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
        <Card className="border-0 shadow-card bg-warning/5 border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {pendingRequestsCount} Pending Facility Requests
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    New facilities awaiting approval
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/facilities/requests")}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("viewRequests")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facilities Table */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            All Facilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={facilitiesState}
            columns={columns}
            filters={filters}
            searchKey="name"
            searchPlaceholder={t("searchFacilities")}
            itemsPerPage={10}
            actions={(facility) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFacility(facility);
                    setIsModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Overview
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/facilities/${facility.id}`)
                  }
                >
                  Details
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Facility Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">
                {selectedFacility?.name} - Facility Details
              </DialogTitle>
            </DialogHeader>
            {selectedFacility && <FacilityModal facility={selectedFacility} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notify All Modal */}
      <Dialog open={isNotifyModalOpen} onOpenChange={setIsNotifyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("notifyAll")}
            </DialogTitle>
            <DialogDescription>
              Send a notification to all {facilitiesState.length} facilities
            </DialogDescription>
          </DialogHeader>
          {notificationSent ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold">Notification Sent!</h3>
              <p className="text-sm text-muted-foreground">
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
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
